<div class="imageContainer" style="" >
    <img src="paintomics_150x690.png" title="Paintomics LOGO." style=" height: 70px !important; margin-bottom: 20px; ">
</div>

# Installing PaintOmics 3

In addition to using the public PaintOmics 3 servers, you can install your own instance of PaintOmics 3.
PaintOmics 3 is distributed under **GNU General Public License, Version 3**.

## Requirements
* UNIX/Linux
* Python 2.7
* Git (optional - see below)
* GNU Make, gcc to compile and install tool dependencies
* MongoDB
* R

## Install the dependencies

```bash
#INSTALL THE LIBRARIES AND TOOLS
sudo apt-get install mongodb python-dev python-mysqldb python-rsvg python-cairo python-cairosvg python-imaging python-pip libatlas-base-dev gfortran libapache2-mod-wsgi

#INSTALL THE PYTHON MODULES
sudo pip install flask
sudo pip install gevent
sudo pip install numpy
sudo pip install fisher
sudo pip install enum
sudo pip install configparser
sudo pip install pymongo
sudo pip install scriptine
sudo pip install datetime
sudo pip install scipy
sudo pip install hashlib
sudo pip install psutil

# INSTALL R
sudo apt-get install r-base r-base-dev


```

## Get the code
Download the latest source code from GitHub:
```bash
cd
git clone https://github.com/fikipollo/paintomics3.git
ls $PWD/paintomics3
```

If you don't have Git (and thus can't run the git command), you can download PaintOmics 3 in an archive instead: [zipped](https://github.com/fikipollo/paintomics3/archive/master.zip) or [tar/gzipped](https://github.com/fikipollo/paintomics3/archive/master.tar.gz). However, this makes it more difficult to stay up to date in the future since there's no simple way to update your copy.

## Configure the server
Copy the example configuration file to a new *serverconf.py* file and adapt the values for the settings.
If you are not sure about the values for an option, leave the default value or contact us for more info ([paintomics@cipf.es](mailto:paintomics@cipf.es).).

```bash
cp $PWD/paintomics3/PaintomicsServer/src/conf/example_serverconf.py $PWD/paintomics3/PaintomicsServer/src/conf/serverconf.py
vi $PWD/paintomics3/PaintomicsServer/src/conf/serverconf.py
```
Following are the options that should be changed when setting up a new PaintOmics 3 instance.

* **SERVER SETTINGS**
  * **SERVER_HOST_NAME**: the IP address where PaintOmics will run, default "0.0.0.0" to access over the network
  * **SERVER_PORT_NUMBER**: the port that will receive the requests, default 8080
  * **SERVER_ALLOW_DEBUG**: set to True to enable debug logs, default False
  * **SERVER_SUBDOMAIN**: if you are using a proxy, set here the subdomain for PaintOmics (e.g. "/paintomics"), default ""
  * **SERVER_MAX_CONTENT_LENGTH**: the max size for client requests in MB, default 20MB

* **FILES SETTINGS**
  * **ROOT_DIRECTORY**: the location of the PaintOmics sources
  * **CLIENT_TMP_DIR** : the directory where the user's data will be stored. Must exists. e.g. "/data/CLIENT_TMP/"
  * **KEGG_DATA_DIR** : the directory where the KEGG data will be stored. Must exists. e.g. "/data/KEGG_DATA/"
  * **MAX_CLIENT_SPACE** : the disk quota for each user in the application, default 20MB

* **MONGO DB SETTINGS**
  * **MONGODB_HOST** : host for the MongoDB
  * **MONGODB_PORT** : port for the MongoDB
  * **MONGODB_DATABASE** : name of the collection PaintOmics

* **MULTITHREADING OPTIONS**
  * **MAX_THREAD**      = 4
  * **MAX_WAIT_THREADS** = 300 #IN SECONDS
  * **N_WORKERS**        = 2

* **CACHE SIZES**
  * **JOB_CACHE_MAX_SIZE** : PaintOmics keeps in a temporal cache some jobs for a faster loading. Reduce this value to reduce server RAM consumption.
  * **KEGG_CACHE_MAX_SIZE** : PaintOmics keeps in a temporal cache the KEGG data for the last used organisms for a faster processing. Reduce this value to reduce server RAM consumption.

* **SMTP CONFIGURATION**: PaintOmics uses SMTP to send the contact emails and the error reports.
  * **smtp_host** : the SMTP email host (Gmail, Office...), e.g. "smtp.gmail.com"
  * **smtp_port**** : the SMTP port, e.g. 465 for Gmail
  * **use_smtp_auth** : Enable SMTP authentication, should be True or False
  * **use_smtp_ssl** : Whether use normal SMTP or SMTP_SSL, should be True or False
  * **smtp_secure** : Use tls, etc.
  * **smpt_username** : The sender email, depends on the SMTP settings
  * **smpt_pass** : the sender pass in MD5 codification, depends on the SMTP settings. There are plenty of tools to do that, a random example would be [this]{http://www.md5hashgenerator.com/}
  * **smpt_sender** : the sender email
  * **smpt_sender_name** : the sender name, e.g. "Paintomics 3"
