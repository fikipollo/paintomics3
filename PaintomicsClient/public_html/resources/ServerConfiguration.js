/*********************************************************************
 * GLOBAL SETTINGS           *****************************************
 **********************************************************************/
APP_VERSION = "v0.4.5";
SERVER_URL = "";
//SERVER_PORT = ":8080";
/*********************************************************************
 * PATHWAY ACQUISITION SERVICES URLS         *************************
 *********************************************************************/
SERVER_URL_PA_STEP1 = SERVER_URL + "pa_step1";
SERVER_URL_PA_EXAMPLE_STEP1 = "pa_step1/example";
SERVER_URL_PA_STEP2 = SERVER_URL + "pa_step2";
SERVER_URL_PA_STEP3 = SERVER_URL + "pa_step3";
SERVER_URL_PA_SAVE_IMAGE = SERVER_URL + "pa_save_image";
SERVER_URL_PA_SAVE_VISUAL_OPTIONS = SERVER_URL + "pa_save_visual_options";
SERVER_URL_PA_RECOVER_JOB = SERVER_URL + "pa_recover_job";
SERVER_URL_PA_TOUCH_JOB = SERVER_URL + "pa_touch_job";
SERVER_URL_JOB_STATUS= SERVER_URL + "check_job_status";
SERVER_URL_GET_CLUSTER_IMAGE= SERVER_URL + "get_cluster_image";
SERVER_URL_GET_MESSAGE = SERVER_URL + "um_get_message";
SERVER_URL_ADJUST_PVALUES = SERVER_URL + "pa_adjust_pvalues";

/*********************************************************************
 * DATA MANIPULATION SERVICES URLS         ***************************
 *********************************************************************/
SERVER_URL_DM_UPLOAD_FILE = SERVER_URL + "dm_upload_file";
SERVER_URL_DM_GET_MYFILES = SERVER_URL + "dm_get_myfiles";
SERVER_URL_DM_GET_GTFFILES = SERVER_URL + "dm_get_gtffiles";
SERVER_URL_DM_DOWNLOAD_FILE = SERVER_URL + "dm_downloadFile";
SERVER_URL_DM_VIEW_FILE = SERVER_URL + "dm_viewFile";
SERVER_URL_DM_DELETE_FILE = SERVER_URL + "dm_delete_file";
SERVER_URL_DM_GET_MYJOBS = SERVER_URL + "dm_get_myjobs";
SERVER_URL_DM_DELETE_JOB = SERVER_URL + "dm_delete_job";
SERVER_URL_DM_FROMBED2GENES = SERVER_URL + "dm_fromBEDtoGenes";
SERVER_URL_DM_FROMMIRNA2GENES = SERVER_URL + "dm_fromMiRNAtoGenes";
SERVER_URL_DM_EXAMPLE_FROMBED2GENES = SERVER_URL + "dm_fromBEDtoGenes/example";
SERVER_URL_DM_EXAMPLE_FROMMIRNA2GENES = SERVER_URL + "dm_fromMiRNAtoGenes/example";
SERVER_URL_DM_SEND_REPORT = SERVER_URL + "dm_sendReport";
/*********************************************************************
 * KEGG DATA URLS                          ***************************
 *********************************************************************/
SERVER_URL_GET_PATHWAY_NETWORK = SERVER_URL + "kegg_data/pathway_network";
SERVER_URL_GET_AVAILABLE_SPECIES = SERVER_URL + "kegg_data/species.json";
/*********************************************************************
 * USER MANIPULATION SERVICES URLS         ***************************
 *********************************************************************/
SERVER_URL_UM_SIGNIN = SERVER_URL + "um_signin";
SERVER_URL_UM_SIGNOUT = SERVER_URL + "um_signout";
SERVER_URL_UM_SIGNUP = SERVER_URL + "um_signup";
SERVER_URL_UM_CHANGEPASS = SERVER_URL + "um_changepassword";
SERVER_URL_UM_NEWGUESTSESSION = SERVER_URL + "um_guestsession";
SERVER_URL_UM_NEWNOLOGINSESSION = SERVER_URL + "um_nologinsession";
/*********************************************************************
 * OTHER SETTINGS            *****************************************
 **********************************************************************/
forceRefresh = false;
nObservers = 0;
debugging = true;
messageDialog = null;
UPLOAD_TIMEOUT=120; /*IN SECONDS*/
MAX_LIVE_JOB=365; /*IN DAYS*/
CHECK_STATUS_TIMEOUT=5000; /*MILISECONDS*/
MAX_PATHWAYS_OPENED=5;
