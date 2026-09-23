const path = require('path');
const fs = require('fs');

async function main() {
  try {
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    
    const dataDir = path.resolve(__dirname, '..', '.postgres_data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('🚀 Initializing embedded PostgreSQL on port 5432...');
    const pg = new EmbeddedPostgres({
      port: 5432,
      user: 'rokad_user',
      password: 'rokad_secret_2026',
      database: 'rokad_db',
      dataDir: dataDir,
      persistent: true
    });

    await pg.initialise();
    await pg.start();
    console.log('✅ PostgreSQL is now RUNNING on localhost:5432 (database: rokad_db, user: rokad_user)!');

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log('Stopping PostgreSQL...');
      await pg.stop();
      process.exit(0);
    });
  } catch (err) {
    console.error('Error running embedded PostgreSQL:', err);
    process.exit(1);
  }
}

main();
