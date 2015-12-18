from pymongo import MongoClient
import logging
from multiprocessing import Process, cpu_count, Manager
from math import ceil
from re import compile as compile_re, IGNORECASE as IGNORECASE_re

from src.common.Util import chunks
from src.common.KeggInformationManager import KeggInformationManager

from src.conf.serverconf import MONGODB_HOST, MONGODB_PORT, MAX_THREADS, MAX_WAIT_THREADS #MULTITHREADING


#*****************************************************************
#   _____ ____  __  __ __  __  ____  _   _
#  / ____/ __ \|  \/  |  \/  |/ __ \| \ | |
# | |   | |  | | \  / | \  / | |  | |  \| |
# | |   | |  | | |\/| | |\/| | |  | | . ` |
# | |___| |__| | |  | | |  | | |__| | |\  |
#  \_____\____/|_|  |_|_|  |_|\____/|_| \_|
#
#*****************************************************************

def getDatabasesByOrganismCode(organism):
    """
    Depending on the organism this function returns the name for the databases
    which contains the valid translations for names into valid KEGG identifiers

    @param {String} organism, the organim code e.g. mmu
    @returns {List} databaseConvertion
    """
    # Nombre del dbname que se obtendra en infrared para la especie en cuestion
    dicDatabases = {
        'mmu'   :   ['entrezgene', 'refseq_gene_symbol'],
        'hsa'   :   ['entrezgene', 'refseq_gene_symbol'],
        'dosa'  :   ['ensembl_transcript', 'kegg_gene_symbol'],
        'rno'  :   ['entrezgene', 'refseq_gene_symbol']
    }

    return dicDatabases.get(organism, ["kegg_id", "kegg_gene_symbol"])

def getConnectionByOrganismCode(organism):
    """
    Devuelve la conexion a la base de datos del organismo correspondiente asi como el nombre de la tabla
    que se usara para realizar la conversion para dicho organismo y un cursor asociado a ella

    @param {String} organism
    @returns
    """
    client = MongoClient(MONGODB_HOST, MONGODB_PORT)
    db = client[organism + "-paintomics"]
    return client, db

#*****************************************************************
#   _____ ______ _   _ ______  _____
#  / ____|  ____| \ | |  ____|/ ____|
# | |  __| |__  |  \| | |__  | (___
# | | |_ |  __| | . ` |  __|  \___ \
# | |__| | |____| |\  | |____ ____) |
#  \_____|______|_| \_|______|_____/
#
#*****************************************************************
def findKeggIDByFeatureName(jobID, featureName, organism, db, databaseConvertion_id):
    """
    This function queries the MongoDB looking for the associated gene ID for the given gene name

    @param {String} jobID, the identifier for the running job, necessary to for the temporal caches
    @param {String} featureName, the name for the feature that we want to map
    @param {String} organism, the organims code
    @param  {pymongo.Database} db, the open connection with MongoDB database
    @param {String} databaseConvertion_id, identifier for the database which contains the translated feature name (e.g. entrezgene for mmu)
    @returns {List} matchedFeatures, a list of translated identifiers
    @returns {Boolean} found, True if we found at least one translation
    """
    #Check if the id is ath the cache of translation
    featureIDs = KeggInformationManager().findInTranslationCache(jobID, featureName, "id")
    if(featureIDs != None):
        return featureIDs, True

    matchedFeatures=[]
    try:
        mates = db.xref.find({"display_id": featureName}, {"item" :1, "mates":1, "qty":1})[0].get("mates") #Will fail if not matches
        cursor=db.xref.find({"dbname_id" : databaseConvertion_id, "_id" : { "$in" : mates }}, {"display_id":1})

        if(cursor.count() > 0):
            for item in cursor:
                matchedFeatures.append(item.get("display_id"))

        return matchedFeatures, len(matchedFeatures) > 0
    except Exception as ex:
        return matchedFeatures, False

def findGeneSymbolByFeatureID(jobID, featureID, organism, db, databaseConvertion_id, databaseGeneSymbol_id):
    """
    This function queries the MongoDB looking for the associated gene symbol for the given gene ID

    @param {String} jobID, the identifier for the running job, necessary to for the temporal caches
    @param {String} featureID, the ID for the feature that we want to map
    @param {String} organism, the organims code
    @param  {pymongo.Database} db, the open connection with MongoDB database
    @param {String} databaseConvertion_id, identifier for the database which contains the translated feature name (e.g. entrezgene for mmu)
    @param {String} databaseGeneSymbol_id, identifier for the database which contains the translated feature symbol (e.g. refseq_gene_symbol for mmu)
    @returns {List} matchedFeature, a gene symbol for the translated identifier
    @returns {Boolean} found, True if we found at least one translation
    """
    #Check if the id is ath the cache of translation
    geneSymbol = KeggInformationManager().findInTranslationCache(jobID, featureID, "symbol")
    if(geneSymbol != None):
        return geneSymbol, True

    try:
        mates = db.xref.find({"display_id": featureID, "dbname_id" : databaseConvertion_id}, {"item" :1, "mates":1, "qty":1})[0].get("mates") #Will fail if not matches
        matchedFeature=db.xref.find_one({"dbname_id" : databaseGeneSymbol_id, "_id" : { "$in" : mates }}, {"display_id":1})
        if(matchedFeature != None):
            return matchedFeature.get("display_id"), True
        return None, False

    except Exception as ex:
        return None, False

def mapFeatureIdentifiers(jobID, organism, featureList, matchedFeatures, notMatchedFeatures, foundFeatures, matchedGeneIDsTablesList, matchedGeneSymbolsTablesList):
    """
    This function is used to query the database in different threads.

    @param  {String} organism, the specie code
    @param  {List}   featureList, the list of feature IDs to map
    @param  {Dict}   alreadyMatchedGenesTable, a dict shared between threads where we store the matching for identifiers
                     (will be combined later with KeggInfoManager cache)
    @param  {List}   matchedFeatures, a list shared between threads where we store the matched features
    @param  {List}   notMatchedFeatures, a list shared between threads where we store the unmatched features

    @returns True
    """


    #***********************************************************************************
    #* STEP 2. GET THE CORRESPONDING DATABASE FOR CURRENT SPECIE
    #***********************************************************************************
    databaseConvertion = getDatabasesByOrganismCode(organism)
    client, db  = getConnectionByOrganismCode(organism)
    databaseConvertion_id = db.dbname.find({"dbname":databaseConvertion[0]}, {"item":1, "qty":1})[0].get("_id")
    databaseGeneSymbol_id = db.dbname.find({"dbname":databaseConvertion[1]}, {"item":1, "qty":1})[0].get("_id")

    try:
        matches=0
        matchedGeneIDsTable={}
        matchedGeneSymbolsTable={}
        for feature in featureList:
            if feature.getName() != "" and feature.getName()!= None:
                featureIDs, found = findKeggIDByFeatureName(jobID, feature.getName(), organism, db, databaseConvertion_id)

                if(found == True):
                    matches+=1
                    matchedGeneIDsTable[feature.getName()] = featureIDs

                    for featureID in featureIDs:
                        feature = feature.clone() #IF MORE THAN 1 MATCH, CLONE THE FEATURE
                        feature.setID(featureID)

                        featureName, found = findGeneSymbolByFeatureID(jobID, featureID, organism, db, databaseConvertion_id, databaseGeneSymbol_id)
                        if found == False:
                            featureName=feature.getName()
                        else:
                            matchedGeneSymbolsTable[featureID] = featureName

                        feature.setName(featureName)
                        matchedFeatures.append(feature)
                else:
                    notMatchedFeatures.append(feature)

        #*************************************************************************************
        # STORE THE RESULTS
        #*************************************************************************************
        foundFeatures.append(matches)
        matchedGeneIDsTablesList.append(matchedGeneIDsTable)
        matchedGeneSymbolsTablesList.append(matchedGeneSymbolsTable)

        return True

    except Exception as ex:
        raise ex
    finally:
        client.close()

def mapFeatureNamesToKeggIDs(jobID, organism, featureList, mapGeneIDs=True):
    """
    This function match the provided list of features
    to KEGG accepted feature ID (e.g. entrez gene ID for mmu)

    @param {String} organism, the organism code e.g. mmu
    @param {List} the list of features to be mapped
    @returns {Integer} foundFeatures, the number of matched features (no repetitions)
    @returns {List} matchedFeatures, the matched features
    @returns {List} notMatchedFeatures, the unmatched features
    """
    #TODO: USE mapGeneIDs

    #***********************************************************************************
    #* STEP 1. CALCULATE THE MAX NUMBER OF THREADS AND PREPARE DATA
    #***********************************************************************************
    try:
        nThreads = min(cpu_count(), MAX_THREADS)        #NUMBER OF THREADS
    except NotImplementedError as ex:
        nThreads = MAX_THREADS

    logging.info("USING " + str(nThreads) + " THREADS")
    logging.info("INPUT " + str(len(featureList)) + " FEATURES")
    logging.info("ORGANISM " + organism)
    logging.info("USING " + str(nThreads) + " THREADS")

    #GET THE NUMBER OF GENES TO BE PROCESSED PER THREAD
    nLinesPerThread = int(ceil(len(featureList)/nThreads)) + 1
    #SPLIT THE ARRAY IN n PARTS
    genesListParts = chunks(featureList, nLinesPerThread)

    manager=Manager()

    #CONCATENATE THE OUTPUT LISTS
    matchedFeatures = manager.list()
    notMatchedFeatures= manager.list()
    foundFeatures= manager.list([0]*nThreads)
    matchedGeneIDsTablesList=manager.list() #STORES THE MAPPING RESULTS TO UPDATE LATER THE CACHE
    matchedGeneSymbolsTablesList=manager.list() #IDEM

    #***********************************************************************************
    #* STEP 2. START THE MAPPING USING N DIFFERENT THREADS IN PARALLEL
    #***********************************************************************************
    try:
        threadsList = []
        i=0
        for genesListPart in genesListParts:
            thread = Process(target=mapFeatureIdentifiers, args=(jobID, organism, genesListPart, matchedFeatures, notMatchedFeatures, foundFeatures, matchedGeneIDsTablesList, matchedGeneSymbolsTablesList))
            threadsList.append(thread)
            thread.start()
            i+=1

        #WAIT UNTIL ALL THREADS FINISHED
        for thread in threadsList:
            thread.join(MAX_WAIT_THREADS)

        for thread in threadsList:
            if(thread.is_alive()):
                thread.terminate()

    except Exception as ex:
        raise ex

    #***********************************************************************************
    #* STEP 3. COMBINE THE RESULTS FOR ALL THE THREADS
    #***********************************************************************************
    #COMBINE DICTIONARIES
    for matchedGeneIDsTable in matchedGeneIDsTablesList:
        KeggInformationManager().updateTranslationCache(jobID, matchedGeneIDsTable, "id")
    for matchedGeneSymbolsTable in matchedGeneSymbolsTablesList:
        KeggInformationManager().updateTranslationCache(jobID, matchedGeneSymbolsTable, "symbol")

    foundFeatures = sum(foundFeatures)

    #***********************************************************************************
    #* STEP 4. RETURN THE RESULTS
    #***********************************************************************************
    logging.info("FINISHED. " + str(foundFeatures) + " uniquely matched features, " +  str(len(matchedFeatures)) + " features matched. " + str(len(notMatchedFeatures)) + " features not matched.")
    return foundFeatures, matchedFeatures, notMatchedFeatures

# *****************************************************************
#    _____ ____  __  __ _____   ____  _    _ _   _ _____   _____
#   / ____/ __ \|  \/  |  __ \ / __ \| |  | | \ | |  __ \ / ____|
#  | |   | |  | | \  / | |__) | |  | | |  | |  \| | |  | | (___
#  | |   | |  | | |\/| |  ___/| |  | | |  | | . ` | |  | |\___ \
#  | |___| |__| | |  | | |    | |__| | |__| | |\  | |__| |____) |
#   \_____\____/|_|  |_|_|     \____/ \____/|_| \_|_____/|_____/
#
# *****************************************************************
def findCompoundIDByFeatureName(jobID, featureName, db):
    """
    This function queries the MongoDB looking for the associated gene ID for the given gene name

    @param {String} jobID, the identifier for the running job, necessary to for the temporal caches
    @param {String} featureName, the name for the feature that we want to map
    @param  {pymongo.Database} db, the open connection with MongoDB database
    @returns {List} matchedFeatures, a list of translated identifiers
    @returns {Boolean} found, True if we found at least one translation
    """
    #Check if the id is ath the cache of translation
    featureIDs = KeggInformationManager().findInTranslationCache(jobID, featureName, "compound")
    if(featureIDs != None):
        return featureIDs, True

    matchedFeatures=[]
    try:
        cursor = db.kegg_compounds.find({"name": {"$regex" : compile_re(".*" + featureName +".*", IGNORECASE_re) }})
        if(cursor.count() > 0):
            for item in cursor:
                matchedFeatures.append(item)

        return matchedFeatures, len(matchedFeatures) > 0
    except Exception as ex:
        return matchedFeatures, False

def mapCompoundsIdentifiers(jobID, featureList, matchedFeatures, notMatchedFeatures, foundFeatures, matchedCompoundIDsTablesList):
    """
    This function is used to query the database in different threads.

    @param  {List}   featureList, the list of feature IDs to map
    @param  {List}   matchedFeatures, a list shared between threads where we store the matched features
    @param  {List}   notMatchedFeatures, a list shared between threads where we store the unmatched features
    @param  {List}   foundFeatures,
    @param  {matchedGeneIDsTablesList}   foundFeatures,
@
    @returns True
    """


    #***********************************************************************************
    #* STEP 2. GET THE CORRESPONDING DATABASE FOR CURRENT SPECIE
    #***********************************************************************************
    client, db  = getConnectionByOrganismCode("global")

    try:
        matches=0
        matchedCompoundIDsTable={}
        for feature in featureList:
            if feature.getName() != "" and feature.getName()!= None:
                matchedCompounds, found = findCompoundIDByFeatureName(jobID, feature.getName(), db)

                if(found == True):
                    matches+=1 #computes the total unique matching
                    oldName = feature.getName()
                    matchedCompoundIDsTable[oldName] = matchedCompounds
                    matchedElement = {"title" : oldName, "mainCompounds" : [], "otherCompounds" : []}
                    for matchedCompound in matchedCompounds:
                        feature = feature.clone() #IF MORE THAN 1 MATCH, CLONE THE FEATURE
                        feature.setID(matchedCompound.get("id"))
                        feature.setName(matchedCompound.get("name"))
                        feature.getOmicsValues()[0].setInputName(matchedCompound.get("name"))

                        if feature.calculateSimilarity(oldName) ==  1:
                            matchedElement["mainCompounds"].append(feature)
                        else:
                            matchedElement["otherCompounds"].append(feature)

                    matchedFeatures.append(matchedElement)
                else:
                    notMatchedFeatures.append(feature)

        #*************************************************************************************
        # STORE THE RESULTS
        #*************************************************************************************
        foundFeatures.append(matches)
        matchedCompoundIDsTablesList.append(matchedCompoundIDsTable)

        return True

    except Exception as ex:
        raise ex
    finally:
        client.close()

def mapFeatureNamesToCompoundsIDs(jobID, featureList):
    """
    This function match the provided list of features
    to KEGG accepted compounds ID

    @param {String} organism, the organism code e.g. mmu
    @param {List} the list of features to be mapped
    @returns {Integer} foundFeatures, the number of matched features (no repetitions)
    @returns {List} matchedFeatures, the matched features
    @returns {List} notMatchedFeatures, the unmatched features
    """

    #***********************************************************************************
    #* STEP 1. CALCULATE THE MAX NUMBER OF THREADS AND PREPARE DATA
    #***********************************************************************************
    try:
        nThreads = min(cpu_count(), MAX_THREADS)        #NUMBER OF THREADS
    except NotImplementedError as ex:
        nThreads = MAX_THREADS

    logging.info("USING " + str(nThreads) + " THREADS")
    logging.info("INPUT " + str(len(featureList)) + " FEATURES")

    #GET THE NUMBER OF GENES TO BE PROCESSED PER THREAD
    nLinesPerThread = int(ceil(len(featureList)/nThreads)) + 1
    #SPLIT THE ARRAY IN n PARTS
    compoundsListParts = chunks(featureList, nLinesPerThread)

    manager=Manager()

    #CONCATENATE THE OUTPUT LISTS
    matchedFeatures = manager.list()
    notMatchedFeatures= manager.list()
    foundFeatures= manager.list([0]*nThreads)
    matchedCompoundIDsTablesList=manager.list() #STORES THE MAPPING RESULTS TO UPDATE LATER THE CACHE

    #***********************************************************************************
    #* STEP 2. START THE MAPPING USING N DIFFERENT THREADS IN PARALLEL
    #***********************************************************************************
    try:
        threadsList = []
        i=0
        for compoundListPart in compoundsListParts:
            thread = Process(target=mapCompoundsIdentifiers, args=(jobID, compoundListPart, matchedFeatures, notMatchedFeatures, foundFeatures, matchedCompoundIDsTablesList))
            threadsList.append(thread)
            thread.start()
            i+=1

        #WAIT UNTIL ALL THREADS FINISHED
        for thread in threadsList:
            thread.join(MAX_WAIT_THREADS)

        for thread in threadsList:
            if(thread.is_alive()):
                thread.terminate()

    except Exception as ex:
        raise ex

    #***********************************************************************************
    #* STEP 3. COMBINE THE RESULTS FOR ALL THE THREADS
    #***********************************************************************************
    #COMBINE DICTIONARIES
    for matchedCompoundIDsTable in matchedCompoundIDsTablesList:
        KeggInformationManager().updateTranslationCache(jobID, matchedCompoundIDsTable, "compound")

    foundFeatures = sum(foundFeatures)

    #***********************************************************************************
    #* STEP 4. RETURN THE RESULTS
    #***********************************************************************************
    logging.info("FINISHED. " + str(foundFeatures) + " uniquely matched compounds, " +  str(len(matchedFeatures)) + " compounds matched. " + str(len(notMatchedFeatures)) + " compounds not matched.")
    return foundFeatures, matchedFeatures, notMatchedFeatures
