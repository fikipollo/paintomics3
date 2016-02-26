#!/bin/bash

ADMIN_USER="admin";
ADMIN_EMAIL="paintomics@cipf.es";
ADMIN_PASS="40bd001563085fc35165329ea1ff5c5ecbdbbeef";
ADMIN_AFFILIATION="CIPF"

DATA_DIR="/data/";

sudo apt-get install mongodb

sudo apt-get install python-dev python-mysqldb python-rsvg python-cairo python-cairosvg python-imaging python-pip libatlas-base-dev gfortran libapache2-mod-wsgi
#sudo apt-get install tk8.5 tcl8.5

sudo pip install flask hashlib gevent numpy fisher enum scipy configparser pymongo scriptine datetime
#sudo pip install pycairo
#sudo pip install cairosvg
#sudo pip install rq
#sudo pip install rq-dashboard

#TODO: INSTALL R PACKAGES (amap)
#*********************************************************
#INITIALIZE MONGO DB
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
db.createCollection("counters")
db.userCollection.insert({userID:"0",userName:"${ADMIN_USER}",email:"${ADMIN_EMAIL}",password:"${ADMIN_PASS}", affiliation:"${ADMIN_AFFILIATION}", activated:"True"})
db.counters.insert({_id:"userID",sequence_value:1})

db.jobInstanceCollection.ensureIndex( { jobID: 1, userID : 1 } )
db.featuresCollection.ensureIndex( { jobID: 1, featureType: 1 } )
db.pathwaysCollection.ensureIndex( { jobID: 1, ID: 1 } )
db.fileCollection.ensureIndex( { userID: 1 } )

EOF

mongo < /tmp/mongo.js
rm /tmp/mongo.js

wget http://bioinfo.cipf.es/paintomics/paintomics-dbs.tar.gz --directory-prefix=/tmp/
tar -zxvf /tmp/paintomics-dbs.tar.gz -C /tmp/

rm -r $DATA_DIR/KEGG_DATA
mv /tmp/paintomics-dbs/KEGG_DATA/ $DATA_DIR
mongorestore /tmp/paintomics-dbs/dump/
rm -r  /tmp/paintomics-dbs
rm -r  /tmp/paintomics-dbs.tar.gz

rm -r $DATA_DIR/CLIENT_TMP
mkdir $DATA_DIR/CLIENT_TMP
mkdir $DATA_DIR/CLIENT_TMP/0
mkdir $DATA_DIR/CLIENT_TMP/0/inputData
mkdir $DATA_DIR/CLIENT_TMP/0/jobsData
mkdir $DATA_DIR/CLIENT_TMP/0/tmp

sudo service apache2 restart