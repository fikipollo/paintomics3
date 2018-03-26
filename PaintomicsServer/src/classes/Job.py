#***************************************************************
#  This file is part of Paintomics v3
#
#  Paintomics is free software: you can redistribute it and/or
#  modify it under the terms of the GNU General Public License as
#  published by the Free Software Foundation, either version 3 of
#  the License, or (at your option) any later version.
#
#  Paintomics is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with Paintomics.  If not, see <http://www.gnu.org/licenses/>.
#
#  More info http://bioinfo.cipf.es/paintomics
#  Technical contact paintomics@cipf.es
#**************************************************************

import logging
from time import strftime as formatDate
from os import path as os_path, makedirs as os_makedirs, walk as os_walk
from shutil import rmtree as shutil_rmtree
from csv import reader as csv_reader
from numpy import percentile as numpy_percentile, min as numpy_min, max as numpy_max

from src.common.Util import Model
from Feature import Gene, Compound, OmicValue
from src.common.FeatureNamesToKeggIDsMapper import mapFeatureNamesToKeggIDs, mapFeatureNamesToCompoundsIDs
from zipfile import ZipFile, ZIP_DEFLATED
from shutil import make_archive as shutil_make_archive

class Job(Model):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, jobID, userID, CLIENT_TMP_DIR):
        self.jobID = jobID
        self.date = formatDate("%Y%m%d%H%M")
        self.accessDate = formatDate("%Y%m%d%H%M")
        self.userID = userID
        self.lastStep = 1
        self.description=""
        self.name = ""

        self.organism = ""

        # LIST OF DATABASES TO USE
        self.databases = []

        #FIRST STEP GET THE DIRECTORIES FOR THE JOB
        self.setDirectories(CLIENT_TMP_DIR)

        #LIST OF OBJECTS THAT CONTAINS ALL THE INPUT OMICS THAT ARE BASED ON COMPOUNDS IDS
        #{omicName:<omicName>, inputDataFile: <inputDataFile>, relevantFeaturesFile: <relevantFeaturesFile>}
        self.compoundBasedInputOmics = []
        #LIST OF OBJECTS THAT CONTAINS ALL THE INPUT OMICS THAT ARE BASED ON GENE IDS
        #{omicName:<omicName>, inputDataFile: <inputDataFile>, relevantFeaturesFile: <relevantFeaturesFile>}
        self.geneBasedInputOmics = []
        #LIST OF OBJECTS THAT CONTAINS ALL THE INPUT REFERENCE FILES
        #{omicName:"Reference file", "fileType": <fileType>, inputDataFile: <inputDataFile>}
        self.referenceInputs = []

        #This table contains the input values for all omics that can be matched to compounds
        #Indexes by compound ID
        self.inputCompoundsData =  {}
        #This table contains the input values for all omics that can be matched to gene
        #Indexes by gene ID
        self.inputGenesData = {}

        # Sharing options
        self.allowSharing = False
        self.readOnly = False

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def setJobID(self, jobID):
        self.jobID = jobID
    def getJobID(self):
        return self.jobID

    def setUserID(self, userID):
        self.userID = userID
    def getUserID(self):
        return self.userID

    def setName(self, name):
        self.name = name
    def getName(self):
        return self.name

    def setLastStep(self, lastStep):
        self.lastStep = lastStep
    def getLastStep(self):
        return self.lastStep

    def getTemporalDir(self):
        return self.temporalDir
    def getInputDir(self):
        return self.inputDir
    def getOutputDir(self):
        return self.outputDir
    def setDirectories(self, CLIENT_TMP_DIR):
        # Assign the userID as directory or "nologin" if is null
        userDir = self.userID if self.userID is not None else "nologin"

        #FIRST STEP GET THE DIRECTORIES FOR THE JOB
        self.inputDir    = CLIENT_TMP_DIR + userDir + "/inputData/"
        self.temporalDir = CLIENT_TMP_DIR + userDir + "/tmp/" + self.jobID
        self.outputDir   = CLIENT_TMP_DIR + userDir + "/jobsData/" + self.jobID + "/output/"

    def setOrganism(self, organism):
        self.organism = organism
    def getOrganism(self):
        return self.organism

    def setDatabases(self, databases):
        self.databases = databases
    def getDatabases(self):
        return self.databases

    def setReferenceInputs(self, referenceInputs):
        self.referenceInputs = referenceInputs
    def getReferenceInputs(self):
        return self.referenceInputs
    def addReferenceInput(self, referenceInput):
        self.referenceInputs.append(referenceInput)

    def setCompoundBasedInputOmics(self, compoundBasedInputOmics):
        self.compoundBasedInputOmics = compoundBasedInputOmics
    def getCompoundBasedInputOmics(self):
        return self.compoundBasedInputOmics
    def addCompoundBasedInputOmic(self, compoundBasedInputOmic):
        self.compoundBasedInputOmics.append(compoundBasedInputOmic)

    def setGeneBasedInputOmics(self, geneBasedInputOmics):
        self.geneBasedInputOmics = geneBasedInputOmics
    def getGeneBasedInputOmics(self):
        return self.geneBasedInputOmics
    def addGeneBasedInputOmic(self, geneBasedInputOmic):
        self.geneBasedInputOmics.append(geneBasedInputOmic)


    def getValueIdTable(self):
        # {ID: values.toBSON() }
        valueTable = {}

        for ID, feature in dict(self.getInputGenesData(), **self.getInputCompoundsData()).iteritems():
            valueTable[ID] = set([feature.getName()])

            for omicValue in feature.getOmicsValues():
                valueTable[ID].add(omicValue.getOriginalName())
                valueTable[ID].add(omicValue.getInputName())

            valueTable[ID] = '|'.join(valueTable[ID])

        return valueTable


    def setInputCompoundsData(self, inputCompoundsData):
        self.inputCompoundsData = inputCompoundsData
    def getInputCompoundsData(self):
        return self.inputCompoundsData
    def addInputCompoundData(self, inputCompoundData):
        currentData = self.inputCompoundsData.get(inputCompoundData.getID(), None)
        if(currentData == None):
            self.inputCompoundsData[inputCompoundData.getID()] = inputCompoundData
        else:
            currentData.combineData(inputCompoundData)

    def setInputGenesData(self, genes):
        self.inputGenesData = genes
    def getInputGenesData(self):
        return self.inputGenesData
    def addInputGeneData(self, inputGeneData):
        currentData = self.inputGenesData.get(inputGeneData.getID(), None)
        if(currentData == None):
            self.inputGenesData[inputGeneData.getID()] = inputGeneData
        else:
            currentData.addOmicValues(inputGeneData.getOmicsValues())

    def setAllowSharing(self, allowSharing):
        self.allowSharing = allowSharing
    def getAllowSharing(self):
        return self.allowSharing

    def setReadOnly(self, readOnly):
        self.readOnly = readOnly
    def getReadOnly(self):
        return self.readOnly

    #******************************************************************************************************************
    # OTHER FUNCTIONS
    #******************************************************************************************************************

    def isSignificativeCompound(self, compoundID):
        """
        This function ...

        @returns
        """
        compoundAux = self.getInputCompoundsData().get(compoundID, None)
        if(compoundAux != None):
            return compoundAux.isSignificative()
        return False

    def isSignificativeGene(self, geneID):
        """
        This function ...

        @returns
        """
        geneAux = self.getInputGenesData().get(geneID, None)
        if(geneAux != None):
            return geneAux.isSignificative()
        return False

    def initializeDirectories(self):
        """
        This function initialize the directories for the current Job instance

        @returns the Job instance
        """
        if not os_path.exists(self.getTemporalDir()):
            os_makedirs(self.getTemporalDir())
        if not os_path.exists(self.getInputDir()):
            os_makedirs(self.getInputDir())
        if not os_path.exists(self.getOutputDir()):
            os_makedirs(self.getOutputDir())

        return self

    def cleanDirectories(self, remove_output=False, remove_input=False):
        if os_path.exists(self.getTemporalDir()):
            shutil_rmtree(self.getTemporalDir())
        if remove_input and os_path.exists(self.getInputDir()):
            shutil_rmtree(self.getInputDir())
        if remove_output and os_path.exists(self.getOutputDir()):
            shutil_rmtree(self.getOutputDir())

        return self

    def validateInput(self):
        raise NotImplementedError()

    def processFilesContent(self):
        raise NotImplementedError()

    def parseGeneBasedFiles(self, inputOmic):
        """
        This function...

        @param {type}
        @returns
        """

        #E.G. Gene Expression, Proteomics, My Own gene data...
        omicName = inputOmic.get("omicName")
        valuesFileName= inputOmic.get("inputDataFile")
        relevantFileName= inputOmic.get("relevantFeaturesFile", "")
        allValues = []  #KEEP ALL VALUES TO CALCULATE PERCENTILES FOR EACH OMIC

        if(inputOmic.get("isExample", False) == False):
            valuesFileName = self.getInputDir() + valuesFileName
            relevantFileName = self.getInputDir() + relevantFileName

        totalInputFeatures  = set()
        totalMappedFeatures = foundFeatures = 0
        featureEnrichment   = inputOmic.get("featureEnrichment", False)

        #*************************************************************************
        # STEP 1. PARSE THE RELEVANT FEATURES FILE FOR THE CURRENT OMIC (IF UPLOADED)
        #         AND EXTRACT THE INFORMATION.
        #*************************************************************************
        logging.info("PARSING RELEVANT FEATURES FILE (" + omicName + ")..." )
        relevantFeatures = self.parseSignificativeFeaturesFile(relevantFileName)
        logging.info("PARSING RELEVANT FEATURES FILE (" + omicName + ")... DONE. " + str(len(relevantFeatures)) + " RELEVANT FEATURES PROCESSED.")

        #*************************************************************************
        # STEP 2. PARSE THE FILE AND EXTRACT THE INFORMATION
        #*************************************************************************
        logging.info("PARSING USER GENE BASED FILE (" + omicName + ")..." )
        parsedFeatures = []

        #IF THE USER UPLOADED VALUES FOR GENE EXPRESSION
        if os_path.isfile(valuesFileName):
            with open(valuesFileName, 'rU') as inputDataFile:
                nLine = 0
                geneAux = omicValueAux = None
                for line in csv_reader(inputDataFile, delimiter="\t"):
                    nLine = nLine+1
                    #*************************************************************************
                    # STEP 2.1 CHECK IF IT IS HEADER, IF SO, IGNORE LINE
                    #*************************************************************************
                    if(nLine == 1 or len(line) == 0):
                        try:
                            float(line[1])
                        except Exception:
                            continue
                    else:
                        #*************************************************************************
                        # STEP 2.C.1 CREATE A NEW OMIC VALUE WITH ROW DATA
                        #*************************************************************************

                        # Split the ID column as it might contain associated_gene:::original_name
                        columnID = line[0].split(":::")

                        omicValueAux = OmicValue(columnID[0])
                        omicValueAux.setOmicName(omicName)
                        # omicValueAux.setRelevant(relevantFeatures.has_key(omicValueAux.getInputName().lower()))
                        # TODO: Relevant flag using whole line including original name?
                        omicValueAux.setRelevant(relevantFeatures.has_key(line[0].lower()))
                        omicValueAux.setValues(map(float, line[1:len(line)]))

                        if len(columnID) > 1:
                            omicValueAux.setOriginalName(columnID[1])

                        #*************************************************************************
                        # STEP 2.C.2 CREATE A NEW TEMPORAL GENE INSTANCE
                        #*************************************************************************
                        geneAux = Gene("")
                        geneAux.setName(columnID[0])
                        geneAux.addOmicValue(omicValueAux)
                        #*************************************************************************
                        # STEP 2.C.3 ADD THE TEMPORAL GENE INSTANCE TO THE LIST OF GENES
                        #*************************************************************************
                        parsedFeatures.append(geneAux)

                        allValues += omicValueAux.getValues()

                        totalInputFeatures.add(omicValueAux.getOriginalName() if featureEnrichment else omicValueAux.getInputName())

                totalInputFeatures = len(totalInputFeatures)
                logging.info("PARSING USER USER GENE BASED FILE (" + omicName + ")... FINISHED. " + str(totalInputFeatures) + " FEATURES PROCESSED.")

                #*************************************************************************
                # STEP 3. MAP TH FEATURE NAMES TO KEGG IDs
                #*************************************************************************
                foundFeatures, parsedFeatures, notMatchedFeatures = mapFeatureNamesToKeggIDs(self.getJobID(), self.getOrganism(), self.getDatabases(), parsedFeatures, featureEnrichment)
                totalMappedFeatures = len(parsedFeatures)
                matchedFeaturesFileContent =""
                notMatchedFeaturesFileContent =""

                #TODO: HACER ESTE METODO MULTITHREADING -> locker
                for parsedFeature in parsedFeatures:
                    self.addInputGeneData(parsedFeature)
                    matchedFeaturesFileContent += parsedFeature.getOmicsValues()[0].getInputName() + '\t' + parsedFeature.getName() + '\t' + parsedFeature.getID() +  '\t' + '\t'.join(map(str,parsedFeature.getOmicsValues()[0].getValues())) + "\n"

                for parsedFeature in notMatchedFeatures:
                    notMatchedFeaturesFileContent += parsedFeature.getName() + '\t' + '\t' + '\t'.join(map(str,parsedFeature.getOmicsValues()[0].getValues())) + "\n"

                temporalFileName = self.getTemporalDir() +  "/" + omicName

                file = open(temporalFileName + '_matched.txt', 'w')
                file.write(matchedFeaturesFileContent)
                file.close()
                file = open(temporalFileName + '_unmatched.txt', 'w')
                file.write(notMatchedFeaturesFileContent)
                file.close()

            inputDataFile.close()
            #*************************************************************************
            # STEP 4. GENERATE SOME STATISTICS
            #*************************************************************************
            summary = numpy_percentile(allValues, [0, 10, 25, 50, 75, 90, 100])

            interquartilRange = summary[4] - summary[2]
            minVal =  summary[2] - 1.5*interquartilRange
            maxVal =  summary[4] + 1.5*interquartilRange

            outliers= []
            for i in range(len(allValues)-1,-1,-1):
                if(allValues[i] < minVal or allValues[i] > maxVal):
                    outliers.append(allValues[i])
                    del allValues[i]

            #TODO: MEJORABLE meter en el bucle anterior
            try:
                summary = summary.tolist() + [numpy_min(allValues), numpy_max(allValues)]
            except:
                summary = summary + [numpy_min(allValues), numpy_max(allValues)]

            logging.info("DISTRIBUTION FOR " + omicName  + ": MIN: " + str(summary[0])  + "; p10: " + str(summary[1]) + "; q1: " + str(summary[2]) + ";  MEDIAN: " + str(summary[3])+ "; q1: " + str(summary[4])  + "; p90: " + str(summary[5]) + ";  MAX VALUE: " + str(summary[6]))
            logging.info("DISTRIBUTION FOR " + omicName  + "WITHOUT OUTLIERS: MIN: " + str(summary[7])  + "; MAX: " + str(summary[8])  + "; #OUTLIERS: " + str(len(outliers)))

            logging.info("PARSING USER GENE BASED FILE (" + omicName + ")... DONE" )

            # Total unique mapped features. "Total" if there are more than one database
            totalMapped = foundFeatures.get("Total", foundFeatures.values()[0])

            #   0        1       2    3    4    5     6,   7   8      9        10
            #[MAPPED, UNMAPPED, MIN, P10, Q1, MEDIAN, Q3, P90, MAX, MIN_IR, Max_IR]
            return [omicName, [foundFeatures, totalInputFeatures - totalMapped] + summary ]

        else:
            logging.error("PARSING USER GENE BASED FILE (" + omicName + ")... FAILED. File " + valuesFileName + " NOT FOUND")

    def parseCompoundBasedFile(self, inputOmic, checkBoxesData):
        """
        This function is used for parsing a file containing data matched to Compounds IDs
        First parse the file and get all the input compound
        After that, for each KEGG compound, check if the keggCompound (KC) is a variation
        of the provided compound.
        If so, add the information about the compound to the Compound Values list and
        generate a new checkbox item (if not exists yet for the KC)

        @param omicName, name of the omic that the data is been parsed
        @param keggInformationManager, contains all the tools and info for ids and names matching
        @returns the changed instances of checkBoxesData
        """
        #GET KEGG DATA FOR THE GIVEN SPECIE
        # keggInformationManager = KeggInformationManager()

        #E.G. Metabolomics, Metabolomics 2, My Metab
        omicName = inputOmic.get("omicName")
        valuesFileName= inputOmic.get("inputDataFile")
        relevantFileName= inputOmic.get("relevantFeaturesFile", "")
        allValues = []  #KEEP ALL VALUES TO CALCULATE PERCENTILES FOR EACH OMIC

        if(inputOmic.get("isExample", False) == False):
            valuesFileName = self.getInputDir() + valuesFileName
            relevantFileName = self.getInputDir() + relevantFileName

        #STEP 1. PARSE THE RELEVANT FEATURES FILE FOR THE CURRENT OMIC (IF UPLOADED) AND EXTRACT THE INFORMATION.
        logging.info("PARSING RELEVANT FEATURES FILE (" + omicName + ")..." )
        relevantFeatures = self.parseSignificativeFeaturesFile(relevantFileName)
        logging.info("PARSING RELEVANT FEATURES FILE (" + omicName + ")... DONE. " + str(len(relevantFeatures)) + " RELEVANT FEATURES PROCESSED.")

        #STEP 2. PARSE THE FILE AND EXTRACT THE INFORMATION
        logging.info("PARSING USER COMPOUND BASED FILE (" + omicName + ")..." )

        #IF THE FILE WAS UPLOADED CORRECTLY,
        if os_path.isfile(valuesFileName):
            inputCompounds = []
            #READ THE FILE LINE BY LINE, CREATE A TEMPORAL COMPOUND WITH THE INFO
            with open(valuesFileName, 'rU') as inputDataFile:
                nLine = 0
                compoundAux = omicValueAux = None
                for line in csv_reader(inputDataFile, delimiter="\t"):
                    nLine = nLine+1
                    #*************************************************************************
                    # STEP 2.1 CHECK IF IT IS HEADER, IF SO, IGNORE LINE
                    #*************************************************************************
                    if(nLine == 1 or len(line) == 0):
                        try:
                            float(line[1])
                        except Exception:
                            continue
                    else:
                        #STEP 2.C.1 CREATE A NEW OMIC VALUE WITH ROW DATA
                        omicValueAux = OmicValue(line[0].lower())
                        omicValueAux.setOmicName(omicName)
                        omicValueAux.setRelevant(relevantFeatures.has_key(omicValueAux.getInputName()))
                        omicValueAux.setValues(map(float, line[1:len(line)]))

                        #STEP 2.C.2 CREATE A NEW TEMPORAL COMPOUND INSTANCE
                        compoundAux = Compound(line[0].lower())
                        compoundAux.setName(line[0])
                        compoundAux.addOmicValue(omicValueAux)

                        inputCompounds.append(compoundAux)
                        allValues += omicValueAux.getValues()

                logging.info("PARSING USER COMPOUND BASED FILE (" + omicName + ")... FINISHED. " + str(len(inputCompounds)) + " FEATURES PROCESSED.");
            inputDataFile.close()


            # FOR EACH PARSED COMPOUND, GET THE NAMES FOR KEGG,
            # THEN FOR EACH COMPOUND IN KEGG, ADD CHECKBOXES
            foundFeatures, parsedFeatures, notMatchedFeatures = mapFeatureNamesToCompoundsIDs(self.getJobID(), inputCompounds)
            for parsedFeature in parsedFeatures:
                #STEP 2.C.3 ADD THE TEMPORAL COMPOUND INSTANCE TO THE LIST OF COMPOUNDS
                for compoundAux in parsedFeature.getMainCompounds():
                    self.addInputCompoundData(compoundAux)
                for compoundAux in parsedFeature.getOtherCompounds():
                    self.addInputCompoundData(compoundAux)

            #GENERATE SOME STATISTICS
            summary = numpy_percentile(allValues, [0,10,25,50,75,90,100])

            interquartilRange = summary[4] - summary[2]
            minVal =  summary[2] - 1.5*interquartilRange
            maxVal =  summary[4] + 1.5*interquartilRange

            outliers= []
            for i in range(len(allValues)-1,-1,-1):
                if(allValues[i] < minVal or allValues[i] > maxVal):
                    outliers.append(allValues[i])
                    del allValues[i]

            try:
                summary = summary.tolist() + [numpy_min(allValues), numpy_max(allValues)]
            except:
                summary = summary + [numpy_min(allValues), numpy_max(allValues)]

            logging.info("DISTRIBUTION FOR " + omicName  + ": MIN: " + str(summary[0])  + "; p10: " + str(summary[1]) + "; q1: " + str(summary[2]) + ";  MEDIAN: " + str(summary[3])+ "; q1: " + str(summary[4])  + "; p90: " + str(summary[5]) + ";  MAX VALUE: " + str(summary[6]))
            logging.info("DISTRIBUTION FOR " + omicName  + "WITHOUT OUTLIERS: MIN: " + str(summary[7])  + "; MAX: " + str(summary[8])  + "; #OUTLIERS: " + str(len(outliers)))

            logging.info("PARSING COMPOUND BASED FILE (" + omicName + ")... DONE" )

            # TODO: changed to assign the foundFeatures/notMatchedFeatures but they are not the same as the raw data (duplicated compounds?)
            # return [omicName, checkBoxesData  + list(parsedFeatures), [-1,-1] + summary ]
            return [omicName, checkBoxesData + list(parsedFeatures), [foundFeatures, len(notMatchedFeatures)] + summary]
        else:
            logging.error("PARSING USER COMPOUND BASED FILE (" + omicName + ")... FAILED. File " + valuesFileName + " NOT FOUND")


    ##*************************************************************************************************************
    # This function is used for parsing a file containing significative features
    #
    # @param {type}
    # @returns
    ##*************************************************************************************************************
    def parseSignificativeFeaturesFile(self, fileName, isBedFormat=False):
        #TODO: HEADER
        relevantFeatures = {}
        if os_path.isfile(fileName):
            with open(fileName, 'rU') as inputDataFile:
                for line in csv_reader(inputDataFile, delimiter="\t"):
                    if(isBedFormat == True):
                        lineProc = line[0] + "_" + line[1] + "_" + line[2]
                    else:
                        lineProc = line[0]

                    # If the relevants file is not in BED format and contains more than 1 column, it means
                    # that the second one contains the original ID
                    if len(line) > 1 and not isBedFormat:
                        featureID = ":::".join([line[0], line[1]]).lower()
                    else:
                        featureID = lineProc.lower()
                    relevantFeatures[featureID] = 1
            inputDataFile.close()
            logging.info("PARSING RELEVANT FEATURES FILE (" + fileName + ")... THE FILE CONTAINS " + str(len(relevantFeatures.keys())) + " RELEVANT FEATURES" );
        else:
            logging.info("PARSING RELEVANT FEATURES FILE (" + fileName + ")... NO RELEVANT FEATURES FILE SUBMITTED" );

        return relevantFeatures

    ##*************************************************************************************************************
    # This function...
    #
    # @param {type}
    # @returns
    ##*************************************************************************************************************
    def parseBSON(self, bsonData):
       bsonData.pop("_id")
       for (attr, value) in bsonData.items():
            if(attr == "inputCompoundsData"):
                compoundInstance = None
                self.inputCompoundsData.clear()
                for (compoundID, compoundData) in value.iteritems():
                    compoundInstance = Compound(compoundID)
                    compoundInstance.parseBSON(compoundData)
                    self.addInputCompoundData(compoundInstance)
            elif(attr == "inputGenesData"):
                geneInstance = None
                self.inputGenesData.clear()
                for (geneID, genData) in value.iteritems():
                    geneInstance = Gene(geneID)
                    geneInstance.parseBSON(genData)
                    self.addInputGeneData(geneInstance)
            elif not isinstance(value, dict) :
                setattr(self, attr, value)

    def toBSON(self, recursive= True):
        bson = {}
        for attr, value in self.__dict__.iteritems():
            if not isinstance(value, dict) and ( ["svgDir", "inputDir", "outputDir", "temporalDir"].count(attr) == 0) :
                bson[attr] = value

            elif(recursive == True):
                if(attr == "inputCompoundsData"):
                    compounds = {}
                    for (compoundID, compoundInstance) in value.iteritems():
                        compounds[compoundID] = compoundInstance.toBSON()
                    value = compounds
                elif(attr == "inputGenesData"):
                    genes = {}
                    for (geneID, geneInstance) in value.iteritems():
                        genes[geneID] = geneInstance.toBSON()
                    value = genes
                bson[attr] = value
        return bson

    def compressDirectory(self, output, format, target):
        if format == "zip":
            try:
                zipf = ZipFile(output + ".zip", 'w', ZIP_DEFLATED)
                for root, dirs, files in os_walk(target):
                    for file in files:
                        zipf.write(os_path.join(root, file), os_path.basename(os_path.join(root, file)))
                zipf.close()
            except Exception as e:
                try:
                    shutil_make_archive(output, "zip", target)
                except Exception as e:
                    raise Exception("Failed while compressing directory")
        else:
            raise Exception("Failed while compressing directory. Format not supported" )
