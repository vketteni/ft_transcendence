# Step 2: Generate the private key and place it in the 'sslcert' folder
openssl genrsa -out server.key 2048

# Step 3: Generate the self-signed certificate with the extensions and place it in the 'sslcert' folder
openssl req -new -x509 -days 365 -key server.key -out server.crt -config openssl.cnf