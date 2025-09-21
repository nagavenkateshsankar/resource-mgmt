package services

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type StorageProvider string

const (
	StorageLocal StorageProvider = "local"
	StorageR2    StorageProvider = "r2"
)

type StorageConfig struct {
	Provider StorageProvider

	// Local storage config
	LocalPath string
	BaseURL   string

	// R2 config
	R2AccountID   string
	R2AccessKey   string
	R2SecretKey   string
	R2BucketName  string
	R2PublicURL   string
}

type UploadResult struct {
	ID          string    `json:"id"`
	FileName    string    `json:"file_name"`
	OriginalName string   `json:"original_name"`
	Size        int64     `json:"size"`
	MimeType    string    `json:"mime_type"`
	URL         string    `json:"url"`
	ThumbnailURL *string  `json:"thumbnail_url,omitempty"`
	Path        string    `json:"path"`
	UploadedAt  time.Time `json:"uploaded_at"`
}

type StorageService struct {
	config   StorageConfig
	s3Client *s3.Client
}

func NewStorageService(config StorageConfig) (*StorageService, error) {
	service := &StorageService{
		config: config,
	}

	// Initialize R2 client if using R2
	if config.Provider == StorageR2 {
		if err := service.initR2Client(); err != nil {
			return nil, fmt.Errorf("failed to initialize R2 client: %w", err)
		}
	}

	// Ensure local directory exists if using local storage
	if config.Provider == StorageLocal {
		if err := os.MkdirAll(config.LocalPath, 0755); err != nil {
			return nil, fmt.Errorf("failed to create local storage directory: %w", err)
		}
	}

	return service, nil
}

func (s *StorageService) initR2Client() error {
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			s.config.R2AccessKey,
			s.config.R2SecretKey,
			"",
		)),
		config.WithRegion("auto"),
	)
	if err != nil {
		return err
	}

	s.s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", s.config.R2AccountID))
	})

	return nil
}

func (s *StorageService) UploadFile(ctx context.Context, file *multipart.FileHeader, path string) (*UploadResult, error) {
	// Generate unique filename
	fileID := uuid.New().String()
	ext := filepath.Ext(file.Filename)
	fileName := fileID + ext
	fullPath := filepath.Join(path, fileName)

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	result := &UploadResult{
		ID:           fileID,
		FileName:     fileName,
		OriginalName: file.Filename,
		Size:         file.Size,
		MimeType:     file.Header.Get("Content-Type"),
		Path:         fullPath,
		UploadedAt:   time.Now(),
	}

	switch s.config.Provider {
	case StorageLocal:
		if err := s.uploadToLocal(src, fullPath, result); err != nil {
			return nil, err
		}
	case StorageR2:
		if err := s.uploadToR2(ctx, src, fullPath, result); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported storage provider: %s", s.config.Provider)
	}

	return result, nil
}

func (s *StorageService) uploadToLocal(src multipart.File, fullPath string, result *UploadResult) error {
	// Create directory if it doesn't exist
	dir := filepath.Dir(filepath.Join(s.config.LocalPath, fullPath))
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Create local file
	localPath := filepath.Join(s.config.LocalPath, fullPath)
	dst, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, src); err != nil {
		return fmt.Errorf("failed to save file: %w", err)
	}

	// Set URL for local storage
	result.URL = s.config.BaseURL + "/" + strings.ReplaceAll(fullPath, "\\", "/")

	return nil
}

func (s *StorageService) uploadToR2(ctx context.Context, src multipart.File, fullPath string, result *UploadResult) error {
	// Upload to R2
	_, err := s.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.config.R2BucketName),
		Key:         aws.String(fullPath),
		Body:        src,
		ContentType: aws.String(result.MimeType),
		Metadata: map[string]string{
			"original-name": result.OriginalName,
			"uploaded-at":   result.UploadedAt.Format(time.RFC3339),
		},
	})
	if err != nil {
		return fmt.Errorf("failed to upload to R2: %w", err)
	}

	// Set URL for R2 storage
	if s.config.R2PublicURL != "" {
		result.URL = s.config.R2PublicURL + "/" + fullPath
	} else {
		result.URL = fmt.Sprintf("https://%s.r2.dev/%s", s.config.R2BucketName, fullPath)
	}

	return nil
}

func (s *StorageService) DeleteFile(ctx context.Context, path string) error {
	switch s.config.Provider {
	case StorageLocal:
		localPath := filepath.Join(s.config.LocalPath, path)
		if err := os.Remove(localPath); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("failed to delete local file: %w", err)
		}
	case StorageR2:
		_, err := s.s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(s.config.R2BucketName),
			Key:    aws.String(path),
		})
		if err != nil {
			return fmt.Errorf("failed to delete from R2: %w", err)
		}
	}
	return nil
}

func (s *StorageService) GetFileURL(path string) string {
	switch s.config.Provider {
	case StorageLocal:
		return s.config.BaseURL + "/" + strings.ReplaceAll(path, "\\", "/")
	case StorageR2:
		if s.config.R2PublicURL != "" {
			return s.config.R2PublicURL + "/" + path
		}
		return fmt.Sprintf("https://%s.r2.dev/%s", s.config.R2BucketName, path)
	}
	return ""
}

func (s *StorageService) GeneratePresignedURL(ctx context.Context, path string, expiration time.Duration) (string, error) {
	if s.config.Provider != StorageR2 {
		return "", fmt.Errorf("presigned URLs only supported for R2 storage")
	}

	presignClient := s3.NewPresignClient(s.s3Client)

	request, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.config.R2BucketName),
		Key:    aws.String(path),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiration
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return request.URL, nil
}

// Helper function to get storage config from environment
func GetStorageConfigFromEnv() StorageConfig {
	provider := os.Getenv("STORAGE_PROVIDER")
	if provider == "" {
		provider = "local"
	}

	config := StorageConfig{
		Provider: StorageProvider(provider),
	}

	switch config.Provider {
	case StorageLocal:
		config.LocalPath = os.Getenv("STORAGE_LOCAL_PATH")
		if config.LocalPath == "" {
			config.LocalPath = "./uploads"
		}
		config.BaseURL = os.Getenv("STORAGE_BASE_URL")
		if config.BaseURL == "" {
			config.BaseURL = "http://localhost:3007/uploads"
		}

	case StorageR2:
		config.R2AccountID = os.Getenv("R2_ACCOUNT_ID")
		config.R2AccessKey = os.Getenv("R2_ACCESS_KEY")
		config.R2SecretKey = os.Getenv("R2_SECRET_KEY")
		config.R2BucketName = os.Getenv("R2_BUCKET_NAME")
		config.R2PublicURL = os.Getenv("R2_PUBLIC_URL") // Optional custom domain
	}

	return config
}

// Helper function to validate file type
func IsValidImageType(mimeType string) bool {
	validTypes := map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}
	return validTypes[mimeType]
}

// Helper function to validate file size
func IsValidFileSize(size int64, maxSizeMB int64) bool {
	maxSizeBytes := maxSizeMB * 1024 * 1024
	return size <= maxSizeBytes
}