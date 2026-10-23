import fs from 'fs';

const users = [
  {
    username: 'practice14',
    password: 'SuperSecretPassword!',
    vuId: 'fddc8f1a',
    state: 'IN_USE'
  },
  {
    username: 'practice6',
    password: 'SuperSecretPassword!',
    vuId: '7d2e2b11',
    state: 'IN_USE'
  }
];

const newEnvVariable = `\nUSERS='${JSON.stringify(users)}'\n`;

if (fs.existsSync('.env')) {
  fs.appendFileSync('.env', newEnvVariable);
  console.log('.env updated successfully');
} else {
  fs.writeFileSync('.env', newEnvVariable.trim());
  console.log('.env created successfully');
}