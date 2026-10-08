import process from 'node:process'

const requiredEnvs = ['PAYLOAD_SECRET']

if (process.env.CI) {
  requiredEnvs.push('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID')
}

const missing = requiredEnvs.filter((name) => !process.env[name])

if (missing.length > 0) {
  console.error('\n❌ ERROR: Missing required environment variable(s):')
  missing.forEach((name) => console.error(`   - ${name}`))
  console.error('\nPlease check your .env file or GitHub Actions secrets.\n')
  process.exit(1)
} else {
  console.log('✅ Environment variable validation passed.')
}
