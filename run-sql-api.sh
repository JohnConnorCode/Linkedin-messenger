#!/bin/bash

# Read the SQL file
SQL_CONTENT=$(cat setup-database.sql)

# Escape for JSON
SQL_ESCAPED=$(echo "$SQL_CONTENT" | jq -Rs .)

# Create the request body
REQUEST_BODY="{\"query\": $SQL_ESCAPED}"

# Make the API request
curl -X POST 'https://api.supabase.com/v1/projects/gpuvqonjpdjxehihpuke/database/query' \
  -H 'Authorization: Bearer sbp_78b071b26a13f1054c5cf4380246723f1ec4cc02' \
  -H 'Content-Type: application/json' \
  -d "$REQUEST_BODY"