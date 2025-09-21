package tests

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DatabaseIntegrationTestSuite provides comprehensive database tests
type DatabaseIntegrationTestSuite struct {
	suite.Suite
	db     *gorm.DB
	rawDB  *sql.DB
	ctx    context.Context
	testDB string
}

// User model for testing (simplified version)
type TestUser struct {
	ID             string    `gorm:"primary_key;type:uuid;default:gen_random_uuid()"`
	OrganizationID string    `gorm:"type:uuid;not null;index"`
	Name           string    `gorm:"not null"`
	Email          string    `gorm:"uniqueIndex:idx_org_email;not null"`
	Password       string    `gorm:"not null"`
	Role           string    `gorm:"not null;default:'inspector'"`
	Status         string    `gorm:"not null;default:'active'"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime"`
}

// TestOrganization model for testing
type TestOrganization struct {
	ID        string    `gorm:"primary_key;type:uuid;default:gen_random_uuid()"`
	Name      string    `gorm:"not null"`
	Domain    string    `gorm:"uniqueIndex;not null"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

// SetupSuite initializes the test database
func (suite *DatabaseIntegrationTestSuite) SetupSuite() {
	suite.ctx = context.Background()
	suite.testDB = "resource_mgmt_test"

	// Connect to PostgreSQL (assuming it's running)
	dsn := "host=localhost user=postgres password=password dbname=postgres port=5432 sslmode=disable"

	// Create test database
	mainDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		suite.T().Skip("PostgreSQL not available for testing")
		return
	}

	rawDB, _ := mainDB.DB()
	_, err = rawDB.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s", suite.testDB))
	if err != nil {
		suite.T().Logf("Could not drop test database: %v", err)
	}

	_, err = rawDB.Exec(fmt.Sprintf("CREATE DATABASE %s", suite.testDB))
	if err != nil {
		suite.T().Skip("Cannot create test database")
		return
	}
	rawDB.Close()

	// Connect to test database
	testDSN := fmt.Sprintf("host=localhost user=postgres password=password dbname=%s port=5432 sslmode=disable", suite.testDB)
	suite.db, err = gorm.Open(postgres.Open(testDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		suite.T().Skip("Cannot connect to test database")
		return
	}

	suite.rawDB, _ = suite.db.DB()

	// Create tables
	err = suite.db.AutoMigrate(&TestUser{}, &TestOrganization{})
	suite.NoError(err, "Should create test tables")

	// Add foreign key constraints
	suite.db.Exec(`
		ALTER TABLE test_users
		ADD CONSTRAINT fk_users_organization
		FOREIGN KEY (organization_id) REFERENCES test_organizations(id) ON DELETE CASCADE
	`)

	// Create indexes for performance testing
	suite.db.Exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON test_users(role)`)
	suite.db.Exec(`CREATE INDEX IF NOT EXISTS idx_users_status ON test_users(status)`)
	suite.db.Exec(`CREATE INDEX IF NOT EXISTS idx_users_org_role ON test_users(organization_id, role)`)
}

// TearDownSuite cleans up the test database
func (suite *DatabaseIntegrationTestSuite) TearDownSuite() {
	if suite.rawDB != nil {
		suite.rawDB.Close()
	}

	// Connect to main database to drop test database
	dsn := "host=localhost user=postgres password=password dbname=postgres port=5432 sslmode=disable"
	mainDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err == nil {
		rawDB, _ := mainDB.DB()
		rawDB.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s", suite.testDB))
		rawDB.Close()
	}
}

// SetupTest creates fresh test data for each test
func (suite *DatabaseIntegrationTestSuite) SetupTest() {
	// Clean tables
	suite.db.Exec("TRUNCATE test_users, test_organizations RESTART IDENTITY CASCADE")

	// Create test organizations
	org1 := TestOrganization{
		ID:     "org1-uuid",
		Name:   "Organization A",
		Domain: "gmail.com",
	}
	org2 := TestOrganization{
		ID:     "org2-uuid",
		Name:   "Organization B",
		Domain: "testorg.com",
	}

	suite.db.Create(&org1)
	suite.db.Create(&org2)

	// Create test users
	admin1 := TestUser{
		ID:             "admin1-uuid",
		OrganizationID: "org1-uuid",
		Name:           "Admin One",
		Email:          "admin1@gmail.com",
		Password:       "hashed_password",
		Role:           "admin",
		Status:         "active",
	}

	admin2 := TestUser{
		ID:             "admin2-uuid",
		OrganizationID: "org1-uuid",
		Name:           "Admin Two",
		Email:          "admin2@gmail.com",
		Password:       "hashed_password",
		Role:           "admin",
		Status:         "active",
	}

	user1 := TestUser{
		ID:             "user1-uuid",
		OrganizationID: "org1-uuid",
		Name:           "User One",
		Email:          "user1@gmail.com",
		Password:       "hashed_password",
		Role:           "inspector",
		Status:         "active",
	}

	user2 := TestUser{
		ID:             "user2-uuid",
		OrganizationID: "org2-uuid",
		Name:           "User Two",
		Email:          "user2@testorg.com",
		Password:       "hashed_password",
		Role:           "inspector",
		Status:         "active",
	}

	suite.db.Create(&admin1)
	suite.db.Create(&admin2)
	suite.db.Create(&user1)
	suite.db.Create(&user2)
}

// TestDatabaseConstraints tests database constraints and integrity
func (suite *DatabaseIntegrationTestSuite) TestDatabaseConstraints() {
	suite.Run("Foreign key constraint prevents orphaned users", func() {
		// Try to create user with non-existent organization
		orphanUser := TestUser{
			OrganizationID: "non-existent-org",
			Name:           "Orphan User",
			Email:          "orphan@test.com",
			Password:       "password",
			Role:           "inspector",
		}

		result := suite.db.Create(&orphanUser)
		suite.Error(result.Error, "Should prevent creating user with invalid organization_id")
	})

	suite.Run("Unique constraint prevents duplicate emails within organization", func() {
		// Try to create user with duplicate email in same organization
		duplicateUser := TestUser{
			OrganizationID: "org1-uuid",
			Name:           "Duplicate User",
			Email:          "admin1@gmail.com", // Already exists
			Password:       "password",
			Role:           "inspector",
		}

		result := suite.db.Create(&duplicateUser)
		suite.Error(result.Error, "Should prevent duplicate emails within organization")
	})

	suite.Run("Allows same email in different organizations", func() {
		// Create user with same email in different organization
		sameEmailUser := TestUser{
			OrganizationID: "org2-uuid",
			Name:           "Same Email User",
			Email:          "admin1@gmail.com", // Same email, different org
			Password:       "password",
			Role:           "inspector",
		}

		result := suite.db.Create(&sameEmailUser)
		suite.NoError(result.Error, "Should allow same email in different organizations")
	})

	suite.Run("NOT NULL constraints work correctly", func() {
		// Try to create user with missing required fields
		incompleteUser := TestUser{
			OrganizationID: "org1-uuid",
			// Name is missing (NOT NULL constraint)
			Email:    "incomplete@test.com",
			Password: "password",
		}

		result := suite.db.Create(&incompleteUser)
		suite.Error(result.Error, "Should enforce NOT NULL constraints")
	})

	suite.Run("Cascade delete removes users when organization is deleted", func() {
		// Count users in org1 before deletion
		var countBefore int64
		suite.db.Model(&TestUser{}).Where("organization_id = ?", "org1-uuid").Count(&countBefore)
		suite.Greater(countBefore, int64(0), "Should have users in org1")

		// Delete organization
		suite.db.Delete(&TestOrganization{}, "id = ?", "org1-uuid")

		// Count users in org1 after deletion
		var countAfter int64
		suite.db.Model(&TestUser{}).Where("organization_id = ?", "org1-uuid").Count(&countAfter)
		suite.Equal(int64(0), countAfter, "Should have no users after organization deletion")
	})
}

// TestTransactionIntegrity tests transaction handling
func (suite *DatabaseIntegrationTestSuite) TestTransactionIntegrity() {
	suite.Run("Transaction rollback on error", func() {
		// Start transaction
		tx := suite.db.Begin()

		// Create a valid user
		newUser := TestUser{
			OrganizationID: "org1-uuid",
			Name:           "Transaction User",
			Email:          "transaction@test.com",
			Password:       "password",
			Role:           "inspector",
		}

		result := tx.Create(&newUser)
		suite.NoError(result.Error, "Should create user in transaction")

		// Try to create invalid user (duplicate email)
		invalidUser := TestUser{
			OrganizationID: "org1-uuid",
			Name:           "Invalid User",
			Email:          "admin1@gmail.com", // Duplicate
			Password:       "password",
			Role:           "inspector",
		}

		result = tx.Create(&invalidUser)
		suite.Error(result.Error, "Should fail to create duplicate user")

		// Rollback transaction
		tx.Rollback()

		// Verify first user was not created
		var count int64
		suite.db.Model(&TestUser{}).Where("email = ?", "transaction@test.com").Count(&count)
		suite.Equal(int64(0), count, "User should not exist after rollback")
	})

	suite.Run("Transaction commit persists changes", func() {
		// Start transaction
		tx := suite.db.Begin()

		// Create user
		newUser := TestUser{
			OrganizationID: "org1-uuid",
			Name:           "Committed User",
			Email:          "committed@test.com",
			Password:       "password",
			Role:           "inspector",
		}

		result := tx.Create(&newUser)
		suite.NoError(result.Error, "Should create user in transaction")

		// Commit transaction
		tx.Commit()

		// Verify user exists
		var count int64
		suite.db.Model(&TestUser{}).Where("email = ?", "committed@test.com").Count(&count)
		suite.Equal(int64(1), count, "User should exist after commit")
	})

	suite.Run("Concurrent transactions isolation", func() {
		// This test simulates concurrent admin count operations
		// to ensure proper isolation

		initialAdminCount := int64(0)
		suite.db.Model(&TestUser{}).Where("organization_id = ? AND role = ?", "org1-uuid", "admin").Count(&initialAdminCount)

		// Start two concurrent transactions
		tx1 := suite.db.Begin()
		tx2 := suite.db.Begin()

		// Both transactions try to create admin users
		admin3 := TestUser{
			OrganizationID: "org1-uuid",
			Name:           "Admin Three",
			Email:          "admin3@gmail.com",
			Password:       "password",
			Role:           "admin",
		}

		admin4 := TestUser{
			OrganizationID: "org1-uuid",
			Name:           "Admin Four",
			Email:          "admin4@gmail.com",
			Password:       "password",
			Role:           "admin",
		}

		// Create in separate transactions
		result1 := tx1.Create(&admin3)
		result2 := tx2.Create(&admin4)

		suite.NoError(result1.Error, "Should create admin3 in tx1")
		suite.NoError(result2.Error, "Should create admin4 in tx2")

		// Commit both transactions
		err1 := tx1.Commit()
		err2 := tx2.Commit()

		suite.NoError(err1.Error, "Should commit tx1")
		suite.NoError(err2.Error, "Should commit tx2")

		// Verify final admin count
		finalAdminCount := int64(0)
		suite.db.Model(&TestUser{}).Where("organization_id = ? AND role = ?", "org1-uuid", "admin").Count(&finalAdminCount)
		suite.Equal(initialAdminCount+2, finalAdminCount, "Should have 2 more admins")
	})
}

// TestIndexPerformance tests query performance with indexes
func (suite *DatabaseIntegrationTestSuite) TestIndexPerformance() {
	suite.Run("Query performance with proper indexes", func() {
		// Create many users for performance testing
		users := make([]TestUser, 1000)
		for i := 0; i < 1000; i++ {
			users[i] = TestUser{
				OrganizationID: "org1-uuid",
				Name:           fmt.Sprintf("User %d", i),
				Email:          fmt.Sprintf("user%d@gmail.com", i),
				Password:       "password",
				Role:           []string{"admin", "inspector", "supervisor", "viewer"}[i%4],
				Status:         []string{"active", "inactive"}[i%2],
			}
		}

		// Batch insert
		result := suite.db.CreateInBatches(users, 100)
		suite.NoError(result.Error, "Should batch insert users")

		// Test indexed query performance
		start := time.Now()
		var adminUsers []TestUser
		suite.db.Where("organization_id = ? AND role = ?", "org1-uuid", "admin").Find(&adminUsers)
		indexedQueryTime := time.Since(start)

		// Query should be fast with proper indexes
		suite.Less(indexedQueryTime, 100*time.Millisecond, "Indexed query should be fast")

		// Test query plan (PostgreSQL specific)
		var explain []map[string]interface{}
		suite.rawDB.QueryRow(`
			EXPLAIN (FORMAT JSON)
			SELECT * FROM test_users
			WHERE organization_id = $1 AND role = $2
		`, "org1-uuid", "admin").Scan(&explain)

		// Verify index is being used (this would need parsing of EXPLAIN output)
		suite.T().Logf("Query completed in %v", indexedQueryTime)
	})

	suite.Run("Pagination performance", func() {
		start := time.Now()
		var users []TestUser
		suite.db.Where("organization_id = ?", "org1-uuid").
			Limit(20).
			Offset(100).
			Find(&users)
		paginationTime := time.Since(start)

		// Pagination should be reasonably fast
		suite.Less(paginationTime, 50*time.Millisecond, "Pagination should be fast")
		suite.T().Logf("Pagination query completed in %v", paginationTime)
	})
}

// TestDataConsistency tests data consistency across operations
func (suite *DatabaseIntegrationTestSuite) TestDataConsistency() {
	suite.Run("Admin count consistency", func() {
		// Get initial admin count
		var initialCount int64
		suite.db.Model(&TestUser{}).Where("organization_id = ? AND role = ?", "org1-uuid", "admin").Count(&initialCount)

		// Change a user role to admin
		suite.db.Model(&TestUser{}).Where("id = ?", "user1-uuid").Update("role", "admin")

		// Get updated admin count
		var updatedCount int64
		suite.db.Model(&TestUser{}).Where("organization_id = ? AND role = ?", "org1-uuid", "admin").Count(&updatedCount)

		suite.Equal(initialCount+1, updatedCount, "Admin count should increase by 1")

		// Change back to inspector
		suite.db.Model(&TestUser{}).Where("id = ?", "user1-uuid").Update("role", "inspector")

		// Verify count returns to initial
		var finalCount int64
		suite.db.Model(&TestUser{}).Where("organization_id = ? AND role = ?", "org1-uuid", "admin").Count(&finalCount)

		suite.Equal(initialCount, finalCount, "Admin count should return to initial value")
	})

	suite.Run("Active admin count consistency", func() {
		// Get initial active admin count
		var initialActiveCount int64
		suite.db.Model(&TestUser{}).Where("organization_id = ? AND role = ? AND status = ?", "org1-uuid", "admin", "active").Count(&initialActiveCount)

		// Deactivate an admin
		suite.db.Model(&TestUser{}).Where("id = ?", "admin2-uuid").Update("status", "inactive")

		// Get updated active admin count
		var updatedActiveCount int64
		suite.db.Model(&TestUser{}).Where("organization_id = ? AND role = ? AND status = ?", "org1-uuid", "admin", "active").Count(&updatedActiveCount)

		suite.Equal(initialActiveCount-1, updatedActiveCount, "Active admin count should decrease by 1")

		// Reactivate admin
		suite.db.Model(&TestUser{}).Where("id = ?", "admin2-uuid").Update("status", "active")

		// Verify count returns to initial
		var finalActiveCount int64
		suite.db.Model(&TestUser{}).Where("organization_id = ? AND role = ? AND status = ?", "org1-uuid", "admin", "active").Count(&finalActiveCount)

		suite.Equal(initialActiveCount, finalActiveCount, "Active admin count should return to initial value")
	})

	suite.Run("Organization isolation consistency", func() {
		// Create user in org2
		newUserOrg2 := TestUser{
			OrganizationID: "org2-uuid",
			Name:           "New User Org2",
			Email:          "newuser@testorg.com",
			Password:       "password",
			Role:           "inspector",
		}

		suite.db.Create(&newUserOrg2)

		// Verify user counts are correct for each organization
		var org1Count, org2Count int64
		suite.db.Model(&TestUser{}).Where("organization_id = ?", "org1-uuid").Count(&org1Count)
		suite.db.Model(&TestUser{}).Where("organization_id = ?", "org2-uuid").Count(&org2Count)

		suite.Greater(org1Count, int64(0), "Org1 should have users")
		suite.Greater(org2Count, int64(0), "Org2 should have users")

		// Cross-organization queries should return isolated results
		var org1Admins []TestUser
		suite.db.Where("organization_id = ? AND role = ?", "org1-uuid", "admin").Find(&org1Admins)

		for _, admin := range org1Admins {
			suite.Equal("org1-uuid", admin.OrganizationID, "Admin should belong to org1")
		}
	})
}

// TestDataMigration tests database migration scenarios
func (suite *DatabaseIntegrationTestSuite) TestDataMigration() {
	suite.Run("Status field default value", func() {
		// Create user without explicit status
		userWithoutStatus := TestUser{
			OrganizationID: "org1-uuid",
			Name:           "User Without Status",
			Email:          "nostatus@test.com",
			Password:       "password",
			Role:           "inspector",
			// Status not set - should default to 'active'
		}

		result := suite.db.Create(&userWithoutStatus)
		suite.NoError(result.Error, "Should create user without explicit status")

		// Fetch user and verify default status
		var createdUser TestUser
		suite.db.Where("email = ?", "nostatus@test.com").First(&createdUser)
		suite.Equal("active", createdUser.Status, "Status should default to 'active'")
	})

	suite.Run("Role field default value", func() {
		// Create user without explicit role
		userWithoutRole := TestUser{
			OrganizationID: "org1-uuid",
			Name:           "User Without Role",
			Email:          "norole@test.com",
			Password:       "password",
			Status:         "active",
			// Role not set - should default to 'inspector'
		}

		result := suite.db.Create(&userWithoutRole)
		suite.NoError(result.Error, "Should create user without explicit role")

		// Fetch user and verify default role
		var createdUser TestUser
		suite.db.Where("email = ?", "norole@test.com").First(&createdUser)
		suite.Equal("inspector", createdUser.Role, "Role should default to 'inspector'")
	})
}

// TestConcurrentOperations tests concurrent database operations
func (suite *DatabaseIntegrationTestSuite) TestConcurrentOperations() {
	suite.Run("Concurrent user creation", func() {
		// Create multiple users concurrently
		done := make(chan bool, 10)
		errors := make(chan error, 10)

		for i := 0; i < 10; i++ {
			go func(index int) {
				user := TestUser{
					OrganizationID: "org1-uuid",
					Name:           fmt.Sprintf("Concurrent User %d", index),
					Email:          fmt.Sprintf("concurrent%d@test.com", index),
					Password:       "password",
					Role:           "inspector",
				}

				result := suite.db.Create(&user)
				if result.Error != nil {
					errors <- result.Error
				}
				done <- true
			}(i)
		}

		// Wait for all goroutines to complete
		errorCount := 0
		for i := 0; i < 10; i++ {
			select {
			case <-done:
				// Success
			case err := <-errors:
				suite.T().Logf("Concurrent creation error: %v", err)
				errorCount++
			case <-time.After(5 * time.Second):
				suite.Fail("Timeout waiting for concurrent operations")
			}
		}

		// Some errors might be expected due to concurrency, but not all should fail
		suite.Less(errorCount, 5, "Most concurrent operations should succeed")

		// Verify users were created
		var count int64
		suite.db.Model(&TestUser{}).Where("email LIKE ?", "concurrent%@test.com").Count(&count)
		suite.Greater(count, int64(5), "Should have created multiple users")
	})

	suite.Run("Concurrent admin count queries", func() {
		// Perform multiple admin count queries concurrently
		done := make(chan int64, 5)

		for i := 0; i < 5; i++ {
			go func() {
				var count int64
				suite.db.Model(&TestUser{}).Where("organization_id = ? AND role = ?", "org1-uuid", "admin").Count(&count)
				done <- count
			}()
		}

		// Collect results
		counts := make([]int64, 5)
		for i := 0; i < 5; i++ {
			counts[i] = <-done
		}

		// All counts should be the same (consistent read)
		firstCount := counts[0]
		for _, count := range counts {
			suite.Equal(firstCount, count, "Concurrent reads should return consistent results")
		}
	})
}

// TestDatabaseBackupRestore tests backup and restore scenarios
func (suite *DatabaseIntegrationTestSuite) TestDatabaseBackupRestore() {
	suite.Run("Data integrity after simulated restore", func() {
		// Count initial users
		var initialCount int64
		suite.db.Model(&TestUser{}).Count(&initialCount)

		// Get user data before "restore"
		var usersBefore []TestUser
		suite.db.Find(&usersBefore)

		// Simulate data corruption by truncating tables
		suite.db.Exec("TRUNCATE test_users RESTART IDENTITY CASCADE")

		// Verify tables are empty
		var countAfterTruncate int64
		suite.db.Model(&TestUser{}).Count(&countAfterTruncate)
		suite.Equal(int64(0), countAfterTruncate, "Tables should be empty after truncate")

		// Simulate restore by recreating data
		for _, user := range usersBefore {
			user.CreatedAt = time.Time{} // Reset timestamps for auto-generation
			user.UpdatedAt = time.Time{}
			suite.db.Create(&user)
		}

		// Verify data integrity after restore
		var countAfterRestore int64
		suite.db.Model(&TestUser{}).Count(&countAfterRestore)
		suite.Equal(initialCount, countAfterRestore, "User count should match after restore")

		// Verify data consistency
		var adminCountAfterRestore int64
		suite.db.Model(&TestUser{}).Where("role = ?", "admin").Count(&adminCountAfterRestore)

		var adminCountBefore int64
		for _, user := range usersBefore {
			if user.Role == "admin" {
				adminCountBefore++
			}
		}

		suite.Equal(adminCountBefore, adminCountAfterRestore, "Admin count should match after restore")
	})
}

// Run the database integration test suite
func TestDatabaseIntegrationTestSuite(t *testing.T) {
	suite.Run(t, new(DatabaseIntegrationTestSuite))
}