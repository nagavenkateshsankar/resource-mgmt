// Simple script to add sample template data
const sampleTemplate = {
    name: "Basic Site Inspection",
    description: "A simple template for basic site safety inspections",
    category: "Safety",
    fields_schema: {
        sections: [
            {
                name: "Site Information",
                description: "Basic details about the inspection site",
                fields: [
                    {
                        name: "weather_condition",
                        label: "Weather Condition",
                        type: "select",
                        required: true,
                        options: ["Sunny", "Cloudy", "Rainy", "Windy", "Foggy"]
                    },
                    {
                        name: "temperature",
                        label: "Temperature (°C)",
                        type: "number",
                        placeholder: "Enter temperature"
                    },
                    {
                        name: "access_restrictions",
                        label: "Access Restrictions",
                        type: "checkbox",
                        options: ["Hard Hat Required", "Safety Vest Required", "Authorized Personnel Only", "No Restrictions"]
                    }
                ]
            },
            {
                name: "Safety Assessment",
                description: "General safety evaluation",
                fields: [
                    {
                        name: "overall_safety",
                        label: "Overall Safety Rating",
                        type: "radio",
                        required: true,
                        options: ["Excellent", "Good", "Fair", "Poor", "Unsafe"]
                    },
                    {
                        name: "hazards_identified",
                        label: "Hazards Identified",
                        type: "checkbox",
                        options: ["Slip/Trip/Fall", "Chemical Exposure", "Electrical", "Moving Machinery", "None"]
                    },
                    {
                        name: "recommendations",
                        label: "Recommendations",
                        type: "textarea",
                        placeholder: "Enter your recommendations...",
                        rows: 4
                    }
                ]
            }
        ]
    }
};

// You can copy and paste this into the browser console after logging in
// Then run: createSampleTemplate()

function createSampleTemplate() {
    fetch('/api/v1/templates', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
        },
        body: JSON.stringify(sampleTemplate)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Sample template created:', data);
        // Reload templates page
        if (window.app) {
            window.app.loadTemplates();
        }
    })
    .catch(error => {
        console.error('Error creating sample template:', error);
    });
}

console.log('Sample template data loaded. Run createSampleTemplate() to add it to the database.');