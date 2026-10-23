


------------------------------------------------------------------------------------
 //hint to run the conccurent test no of time whithout using user.json
------------------------------------------------------------------------------------



 node .\searchFilePath.js --runloadtest artillery.js

 node .\commander.js --runtest ./artillery.js --parallel

 ----------------------------------------------------------------------------------
 ----------------------------------------------------------------------------------

 docker run -d `
  --name artillery-mongo `
  -p 27017:27017 `
  -v artillery-mongo-data:/data/db `
  -e MONGO_INITDB_ROOT_USERNAME=admin `
  -e MONGO_INITDB_ROOT_PASSWORD=password123 `
  mongo:latest

  --------------------------------------------------------------------------------
  --------------------------------------------------------------------------------

  node commander.js --solo --runfargate artillery.js --output result.json --workerpod 2 --scenario-name smoke --region us-east-1 --cpu 1024 --memory 2048 --tag user:kshitij.shirsat --key abc123