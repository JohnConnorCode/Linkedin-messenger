#!/bin/bash

ACCESS_TOKEN="sbp_78b071b26a13f1054c5cf4380246723f1ec4cc02"
PROJECT_REF="gpuvqonjpdjxehihpuke"

echo "Creating storage buckets..."

# Create screenshots bucket
echo "Creating 'screenshots' bucket..."
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/storage/buckets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "screenshots",
    "public": false,
    "file_size_limit": 52428800,
    "allowed_mime_types": ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
  }'

echo -e "\n"

# Create sessions bucket
echo "Creating 'sessions' bucket..."
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/storage/buckets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sessions",
    "public": false,
    "file_size_limit": 10485760,
    "allowed_mime_types": ["application/json"]
  }'

echo -e "\n"

# List buckets to verify
echo "Verifying buckets..."
curl -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF/storage/buckets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq .