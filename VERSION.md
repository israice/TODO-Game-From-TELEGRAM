
# INSTALL
npm install

# RECOVERY
git log --oneline -n 5

Copy-Item .env $env:TEMP\.env.backup
git reset --hard 80f714fc
git clean -fd
Copy-Item $env:TEMP\.env.backup .env -Force
git push origin master --force
node run.js

# UPDATE
git add .
git commit -m "v0.0.4 - added multi telegram users support"
git push
node run.js

# DEV LOG
v0.0.1 - telegram bot to open a page in browser
v0.0.2 - same functionality with minimum code
v0.0.3 - always openeed browser fast and simple
v0.0.4 - added multi telegram users support