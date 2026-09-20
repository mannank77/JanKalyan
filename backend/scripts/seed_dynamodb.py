import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('scheme-navigator-GovSchemes')

SAMPLE_SCHEMES = [
    {
        "scheme_id": "PM-KUSUM",
        "name": "PM-KUSUM (Solar Agricultural Pumps)",
        "summary": "Subsidies up to 60% for installing standalone solar agriculture pumps.",
        "states": ["Maharashtra", "Gujarat", "Rajasthan", "All India"],
        "categories": ["Farmer", "Small Landholder"],
        "eligibility": {"land_size_max_ha": 2},
        "benefits": {"subsidy": "60%", "component": "Standalone Solar Pump (Up to 7.5 HP)"},
        "application_url": "https://pmkusum.mnre.gov.in"
    },
    {
        "scheme_id": "PM-KISAN",
        "name": "PM-KISAN Samman Nidhi",
        "summary": "Income support of ₹6,000 per year in three equal installments to all landholding farmer families.",
        "states": ["All India"],
        "categories": ["Farmer"],
        "eligibility": {"land_size_max_ha": 999},
        "benefits": {"direct_benefit_transfer": "₹6,000 / year"},
        "application_url": "https://pmkisan.gov.in"
    },
    {
        "scheme_id": "MUDRA-YOJANA",
        "name": "Pradhan Mantri Mudra Yojana (PMMY)",
        "summary": "Loans up to 10 Lakhs to non-corporate, non-farm small/micro enterprises.",
        "states": ["All India"],
        "categories": ["Woman", "Entrepreneur", "MSME"],
        "eligibility": {"land_size_max_ha": 0},
        "benefits": {"loan_limit": "Up to ₹10 Lakhs without collateral"},
        "application_url": "https://www.mudra.org.in"
    },
    {
        "scheme_id": "AYUSHMAN-BHARAT",
        "name": "Ayushman Bharat (PM-JAY)",
        "summary": "Health insurance cover of up to ₹5 Lakh per family per year for secondary and tertiary care.",
        "states": ["All India"],
        "categories": ["Senior Citizen", "Low Income", "Farmer", "Woman"],
        "eligibility": {},
        "benefits": {"health_coverage": "₹5,00,000 / family / year"},
        "application_url": "https://pmjay.gov.in"
    },
    {
        "scheme_id": "NSP-SCHOLARSHIP",
        "name": "National Scholarship Portal Schemes",
        "summary": "Financial support for higher education for students from rural and underprivileged backgrounds.",
        "states": ["All India"],
        "categories": ["Student"],
        "eligibility": {},
        "benefits": {"tuition_support": "₹10,000 to ₹50,000 / year"},
        "application_url": "https://scholarships.gov.in"
    }
]

print("Populating DynamoDB table 'GovSchemes'...")
for item in SAMPLE_SCHEMES:
    table.put_item(Item=item)
    print(f"✓ Inserted: {item['scheme_id']}")
print("Data seeding completed!")