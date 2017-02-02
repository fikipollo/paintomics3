#!/bin/bash

#******************************************************************************
#YOU CAN SET THIS OPTIONS IN THE DOCKER COMPOSE FILE OR USING ENVIROMENT OPTIONS
#******************************************************************************
ADMIN_EMAIL="admin@paintomics.es"; #WILL BE USED FOR LOGIN AS ADMIN
ADMIN_PASS="40bd001563085fc35165329ea1ff5c5ecbdbbeef"; #PASSWORD CODIFIED IN SHA1
ADMIN_AFFILIATION="My awesome workplace"
DATA_DIR="/data/paintomics3";

#DO NOT CHANGE THIS OPTIONS
ADMIN_USER="admin";
DATA_HOST="http://bioinfo.cipf.es/paintomics"
#*********************************************************

#*********************************************************
#STEP 1. INSTALL DEPENDENCIES
#*********************************************************
sudo apt-get update
sudo apt-get install mongodb python-dev python-mysqldb python-rsvg python-cairo python-cairosvg python-imaging python-pip libatlas-base-dev gfortran libapache2-mod-wsgi r-base r-base-dev mongodb-clients


#*********************************************************
#STEP 2. INSTALL PYTHON MODULES
#*********************************************************
#Tested with flask 0.10.1 |
sudo pip install flask
#Tested with gevent 1.0 |
sudo pip install gevent
#Tested with numpy 1.9.1 | 1.9.2
sudo pip install numpy
#Tested with enum 0.4.4 |
sudo pip install enum
#Tested with configparser 3.3.0r2 |
sudo pip install configparser
#Tested with pymongo 2.7.2 |
sudo pip install pymongo
#Tested with scriptine 0.2.1 |
sudo pip install scriptine
#Tested with datetime 4.0.1 |
sudo pip install datetime
#Tested with scipy 0.17.0 | 0.18.0
sudo pip install scipy
#Tested with psutil 1.2.1 |
sudo pip install psutil
#Tested with hashlib 20081119 |
#sudo pip install hashlib


#*********************************************************
#STEP 3. INSTALL R PACKAGES
#*********************************************************
sudo R --no-save -e "install.packages('amap', repos='http://cran.us.r-project.org'); q();"


#*********************************************************
#STEP 4. CREATE THE MAIN PAINTOMICS DATABASE
#*********************************************************
cat <<EOF > /tmp/mongo.js
use PaintomicsDB;
db.dropDatabase();
use PaintomicsDB;
db.createCollection("featuresCollection");
db.createCollection("jobInstanceCollection");
db.createCollection("pathwaysCollection");
db.createCollection("userCollection");
db.createCollection("fileCollection");
db.createCollection("messageCollection");
db.createCollection("counters");
db.userCollection.insert({userID:"0",userName:"${ADMIN_USER}",email:"${ADMIN_EMAIL}",password:"${ADMIN_PASS}", affiliation:"${ADMIN_AFFILIATION}", activated:"True"});
db.counters.insert({_id:"userID",sequence_value:1});
db.userCollection.ensureIndex( { userID : 1 } );
db.jobInstanceCollection.ensureIndex( { jobID: 1, userID : 1 } );
db.featuresCollection.ensureIndex( { jobID: 1, featureType: 1 } );
db.pathwaysCollection.ensureIndex( { jobID: 1, ID: 1 } );
db.visualOptionsCollection.ensureIndex( { jobID: 1 } );
db.fileCollection.ensureIndex( { userID: 1 } );
EOF

mongo < /tmp/mongo.js
rm /tmp/mongo.js

#*********************************************************
#STEP 5. DOWNLOAD AND CREATE THE DEFAULT SPECIES DATABASE
#*********************************************************
echo "DOWNLOADING DATA (THIS MAY TAKE FEW MINUTES)..."
wget --quiet $DATA_HOST/paintomics-dbs.tar.gz --directory-prefix=/tmp/
echo "EXTRACTING AND INSTALLING DATA... "
tar -zxvf /tmp/paintomics-dbs.tar.gz -C /tmp/
mv /tmp/paintomics-dbs/KEGG_DATA/ $DATA_DIR
chown -R www-data:www-data $DATA_DIR/KEGG_DATA/
mongorestore --host paintomics3-mongo  --db mmu-paintomics /tmp/paintomics-dbs/dump/mmu-paintomics/
mongorestore --host paintomics3-mongo  --db global-paintomics /tmp/paintomics-dbs/dump/global-paintomics/
rm -r  /tmp/paintomics-dbs
rm -r  /tmp/paintomics-dbs.tar.gz
cat <<EOF > $DATA_DIR/KEGG_DATA/last/species/species.json
{"success": true, "species": [
			{"name": "Mus musculus (mouse)", "value": "mmu"}
]}
EOF


#*********************************************************
#STEP 6. CREATE THE DIRECTORY FOR USER DATA
#*********************************************************
mkdir $DATA_DIR/CLIENT_TMP
mkdir $DATA_DIR/CLIENT_TMP/0
mkdir $DATA_DIR/CLIENT_TMP/0/inputData
mkdir $DATA_DIR/CLIENT_TMP/0/jobsData
mkdir $DATA_DIR/CLIENT_TMP/0/tmp
chown -R www-data:www-data $DATA_DIR/CLIENT_TMP/
