#!/usr/bin/python
import os, csv, json
from time import sleep
from sys import argv, stdout, stderr, path
from subprocess import check_call, check_output, CalledProcessError

path.insert(0, os.path.dirname(os.path.realpath(__file__)) + "/../")

class XREF_Entry (object):
    def __init__(self, display_id, dbname_id, description):
        self._id= None
        self.display_id= display_id
        self.dbname_id= dbname_id
        self.description= description

    def setID(self, _id):
        self._id = _id
    def getID(self):
        return self._id
    def __str__(self):
        return "{_id : " + self._id + "display_id : " + self.display_id + "dbname_id : " + self.dbname_id + "description : " + self.description + "}"
    def __repr__(self):
        return self.__str__()

class DBNAME_Entry (object):
    def __init__(self, dbname, display_label, dbname_type):
        self._id= None
        self.dbname= dbname
        self.display_label= display_label
        self.dbname_type = dbname_type

    def setID(self, _id):
        self._id = _id
    def getID(self):
        return self._id

def generateRandomID():
    import string, random
    randomID = ""
    valid = False
    while not valid:
        randomID = ''.join(random.sample(string.hexdigits*5,24))
        valid = ((not xref.has_key(randomID)) and (not transcript2xref.has_key(randomID)) and (not dbname.has_key(randomID)))

    return randomID

def insertXREF(item):
    elemAux = ALL_ENTRIES.get(item.display_id+"#"+item.dbname_id, None)

    if elemAux == None: #did not exists
        item.setID(generateRandomID())
        xref[item.getID()] = item
        ALL_ENTRIES[item.display_id+"#"+item.dbname_id] = item
        elemAux=item

    return elemAux.getID()

def findXREF(entry_name, db_id):
    return ALL_ENTRIES.get(entry_name + "#" + db_id, None)

def deleteXREF(itemID):
    del ALL_ENTRIES[xref.get(itemID).display_id + "#" + xref.get(itemID).dbname_id]
    del xref[itemID]

def insertTR_XREF(item_id, transcript_id):
    elemAux = transcript2xref.get(transcript_id, set([]))
    if not transcript2xref.has_key(transcript_id):
        transcript2xref[transcript_id] = elemAux
    elemAux.add(item_id)

    elemAux = xref2transcript.get(item_id, set([]))
    if not xref2transcript.has_key(item_id):
        xref2transcript[item_id] = elemAux
    elemAux.add(transcript_id)

def insertDatabase(item):
    elemAux = ALL_DBS.get(item.dbname, None)

    if elemAux == None: #did not exists
        item.setID(generateRandomID())
        dbname[item.getID()] = item
        ALL_DBS[item.dbname] = item
        elemAux = item

    return elemAux.getID()

def translate(featureName, destinationDB):
    found=[]

    #FIND THE ID FOR DATABASE
    for item in dbname.itervalues():
        if(item.dbname == destinationDB):
            destinationDB = item.getID()
            break

    #FIND THE FEATURES WHOSE NAME MATCH TO PROVIDED
    for item in xref.itervalues():
        if(item.display_id == featureName):
            found.append(item.getID())

    #FOR EACH MATCH, FIND THE ASSOCIATED TRANSCRIPTS
    found2 = set([])
    for item in found:
        for key, value in transcript2xref.iteritems():
            if(item in value): #IF THE TRANSCRIPT IS ASSOCIATED TO CURRENT ITEM
                found2 = found2.union(value) #MERGE ALL POSSIBLE MATCHES (WE WILL FILTER LATER BY DB ID)

    #FOR EACH MATCHED ITEM, FILTER BY DATABASE ID
    found=[]
    for item_id in found2:
        item = xref.get(item_id)
        if(item.dbname_id == destinationDB):
            found.append(item)

    return found

def showPercentage(n, total, prev, errorMessage):
    percen = int(n/float(total)*10)
    stderr.write("0%[" + ("#"*percen) + (" "*(10 - percen)) + "]100% [" + str(n) + "/" + str(total) + "]\t"+ errorMessage + "\r" )
    return percen

#**************************************************************************
#  ______ _   _  _____ ______ __  __ ____  _
# |  ____| \ | |/ ____|  ____|  \/  |  _ \| |
# | |__  |  \| | (___ | |__  | \  / | |_) | |
# |  __| | . ` |\___ \|  __| | |\/| |  _ <| |
# | |____| |\  |____) | |____| |  | | |_) | |____
# |______|_| \_|_____/|______|_|  |_|____/|______|
#
#**************************************************************************
def processEnsemblData():
    """
    # ENSEMBL MAPPING FILE CONTAINS THE FOLLOWING COLUMNS
    # 1. Ensembl Gene ID
    # 2. EntrezGene ID
    # 3. Ensembl Protein ID
    # 4. Ensembl Transcript ID
    """
    FAILED_LINES["ENSEMBL"]=[]

    resource = EXTERNAL_RESOURCES.get("ensembl")[0]
    file_name= DATA_DIR + "mapping/" + resource.get("output")
    if not os.path.isfile(file_name):
        stderr.write("Unable to find the ENSEMBL MAPPING file: " + file_name)
        exit(1)

    #Get line count (for percentage)
    total_lines = int(check_output(['wc', '-l', file_name]).split(" ")[0])

    #Register databases and get the assigned IDs
    ensembl_transcript_db_id = insertDatabase(DBNAME_Entry("ensembl_transcript", "Ensembl transcript", "Identifier"))
    ensembl_gene_db_id = insertDatabase(DBNAME_Entry("ensembl_gene", "Ensembl gene", "Identifier"))
    ensembl_peptide_db_id = insertDatabase(DBNAME_Entry("ensembl_peptide", "Ensembl protein", "Identifier"))
    entrezgene_db_id = insertDatabase(DBNAME_Entry("entrezgene", "EntrezGene ID", "Identifier"))

    #Process files
    stderr.write("PROCESSING ENSEMBL MAPPING FILE...\n")
    with open(file_name, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter=',')
        i =0
        prev=-1
        errorMessage=""

        for row in rows:
            i+=1
            prev = showPercentage(i, total_lines, prev, errorMessage)
            try:
                ensembl_gi = row[0]
                entrez_gi = row[1]
                ensembl_pi = row[2]
                ensembl_ti = row[3]

                if ensembl_ti == "": #ALWAYS FALSE
                    raise Exception("Empty ENSEMBL transcript value.")

                ensembl_ti = insertXREF(XREF_Entry(ensembl_ti, ensembl_transcript_db_id, resource.get("description")))
                insertTR_XREF(ensembl_ti, ensembl_ti)

                if ensembl_gi != "": #ALWAYS TRUE
                    ensembl_gi = insertXREF(XREF_Entry(ensembl_gi, ensembl_gene_db_id, resource.get("description")))
                    insertTR_XREF(ensembl_gi, ensembl_ti)

                if entrez_gi != "":
                    entrez_gi = insertXREF(XREF_Entry(entrez_gi, entrezgene_db_id, resource.get("description")))
                    insertTR_XREF(entrez_gi, ensembl_ti)

                if ensembl_pi != "":
                    ensembl_pi = insertXREF(XREF_Entry(ensembl_pi, ensembl_peptide_db_id, resource.get("description")))
                    insertTR_XREF(ensembl_pi, ensembl_ti)

            except Exception as ex:
                errorMessage = "FAILED WHILE PROCESSING ENSEMBL MAPPING FILE [line " + str(i) + "]: "+ ex.message
                FAILED_LINES["ENSEMBL"].append([errorMessage] + row)
    csvfile.close()

    TOTAL_FEATURES["ENSEMBL"]=total_lines

    return total_lines

#**************************************************************************
#
# |  __ \|  ____|  ____/ ____|  ____/ __ \
# | |__) | |__  | |__ | (___ | |__ | |  | |
# |  _  /|  __| |  __| \___ \|  __|| |  | |
# | | \ \| |____| |    ____) | |___| |__| |
# |_|  \_\______|_|   |_____/|______\___\_\
#
#**************************************************************************
def processRefSeqData():
    """
    # REFSEQ MAPPING FILE CONTAINS THE LOT OF COLUMNS
    # 1. tax_id
    # 2. Entrez ID
    # ...
    # 4. RNA_nucleotide_accession.version
    # 5. RNA_nucleotide_gi
    # 6. protein_accession.version
    # 7. protein_gi
    # ...
    """
    stderr.write("\n\nPROCESSING REFSEQ MAPPING FILE...\n")
    FAILED_LINES["REFSEQ"]=[]

    #Get settings for the file
    resource = EXTERNAL_RESOURCES.get("refseq")[0]
    file_name= DATA_DIR + "mapping/" + resource.get("output")

    #Check if file exists
    if not os.path.isfile(file_name):
        stderr.write("Unable to find the REFSEQ MAPPING file: " + file_name)
        exit(1)

    #Extract the file in a temporal directory
    stderr.write("  * EXTRACTING FILE...\n")
    command = "gunzip -c  " + file_name + " | awk '{if($1==\"" + str(resource.get("specie-code")) + "\"){print $0}}' > /tmp/build.tmp"
    check_call(command, shell=True)
    stderr.write("  * PROCESSING FILE...\n")

    #Count the number of genes (for percentage)
    total_lines = int(check_output(['wc', '-l', "/tmp/build.tmp"]).split(" ")[0])

    #Register the databases
    refseq_rna_predicted_db_id = insertDatabase(DBNAME_Entry("refseq_rna_predicted", "RefSeq RNA nucleotide accession (predicted)", "Identifier"))
    refseq_rna_curated_db_id = insertDatabase(DBNAME_Entry("refseq_rna_curated", "RefSeq RNA nucleotide accession (curated)", "Identifier"))
    refseq_peptide_predicted_db_id = insertDatabase(DBNAME_Entry("refseq_peptide_predicted", "RefSeq protein accession (predicted)", "Identifier"))
    refseq_peptide_curated_db_id = insertDatabase(DBNAME_Entry("refseq_peptide_curated", "RefSeq protein accession (curated)", "Identifier"))
    entrezgene_db_id = insertDatabase(DBNAME_Entry("entrezgene", "EntrezGene ID", "Identifier"))

    #Add the entries for tables
    with open("/tmp/build.tmp", "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')
        i =0
        prev=-1
        errorMessage=""

        for row in rows:
            i+=1
            prev = showPercentage(i, total_lines, prev, errorMessage)
            try:
                entrez_tax = row[0]

                if entrez_tax != str(resource.get("specie-code")):
                    continue

                entrez_gi = row[1]
                rna_acc   = row[3]
                rna_gi    = row[4]
                prot_acc  = row[5]
                prot_gi   = row[6]

                if rna_acc == "-":
                    raise Exception("Empty REFSEQ transcript value.")

                if rna_acc[0].lower() == "x": #predicted
                    rna_acc = insertXREF(XREF_Entry(rna_acc, refseq_rna_predicted_db_id, resource.get("description")))
                else:
                    rna_acc = insertXREF(XREF_Entry(rna_acc, refseq_rna_curated_db_id, resource.get("description")))
                insertTR_XREF(rna_acc, rna_acc)

                if entrez_gi != "-": #ALWAYS TRUE
                    entrez_gi = insertXREF(XREF_Entry(entrez_gi, entrezgene_db_id, resource.get("description")))
                    insertTR_XREF(entrez_gi, rna_acc)

                if prot_acc != "-":
                    if prot_acc[0].lower() == "x": #predicted
                        internalID = insertXREF(XREF_Entry(prot_acc, refseq_peptide_predicted_db_id, resource.get("description")))
                    else:
                        internalID = insertXREF(XREF_Entry(prot_acc, refseq_peptide_curated_db_id, resource.get("description")))

                    insertTR_XREF(internalID, rna_acc)

            except Exception as ex:
                errorMessage= "FAILED WHILE PROCESSING REFSEQ MAPPING FILE [line " + str(i) + "]: "+ ex.message
                FAILED_LINES["REFSEQ"].append([errorMessage] + row)

    csvfile.close()
    os.remove("/tmp/build.tmp")

    TOTAL_FEATURES["REFSEQ"]=total_lines

    return total_lines

def processRefSeqGeneSymbolData():
    """
    # REFSEQ MAPPING FILE CONTAINS THE LOT OF COLUMNS
    # 1. tax_id
    # 2. Entrez ID
    # 3. Symbol
    # 4. ...
    # 5. Synonyms
    # ...
    """
    FAILED_LINES["REFSEQ GENE SYMBOL"]=[]

    stderr.write("\n\nPROCESSING REFSEQ GENE SYMBOL MAPPING FILE...\n")

    #Get settings for the file
    resource = EXTERNAL_RESOURCES.get("refseq")[1]
    file_name= DATA_DIR + "mapping/" + resource.get("output")

    #Check if file exists
    if not os.path.isfile(file_name):
        stderr.write("Unable to find the REFSEQ GENE SYMBOL MAPPING file: " + file_name)
        exit(1)

    #Extract the file in a temporal directory
    stderr.write("  * EXTRACTING FILE...\n")
    command = "gunzip -c  " + file_name + " | awk '{if($1==\"" + str(resource.get("specie-code")) + "\"){print $0}}' > /tmp/build.tmp"
    check_call(command, shell=True)
    stderr.write("  * PROCESSING FILE...\n")

    #Count the number of genes (for percentage)
    total_lines = int(check_output(['wc', '-l', "/tmp/build.tmp"]).split(" ")[0])

    #Register the databases
    refseq_gene_symbol_db_id = insertDatabase(DBNAME_Entry("refseq_gene_symbol", "RefSeq Gene Symbol", "Identifier"))
    refseq_gene_symbol_synonyms_db_id = insertDatabase(DBNAME_Entry("refseq_gene_symbol_synonyms", "RefSeq Gene Symbol Synonyms", "Identifier"))
    entrezgene_db_id = insertDatabase(DBNAME_Entry("entrezgene", "EntrezGene ID", "Identifier"))

    #Add the entries for tables
    with open("/tmp/build.tmp", "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')
        i =0
        prev=-1
        errorMessage=""

        for row in rows:
            i+=1
            prev = showPercentage(i, total_lines, prev, errorMessage)
            try:
                #CHECK IF THE SPECIE CODE IS VALID
                entrez_tax = row[0]
                if entrez_tax != str(resource.get("specie-code")):
                    continue

                #READ THE VALUES
                entrez_gi    = row[1]
                gene_symbol  = row[2]
                synonyms     = row[4]

                if gene_symbol == "-":
                    raise Exception("Empty REFSEQ Gene Symbol value.")

                #CHECK ENTREZ ID WAS PREVIOSLY REGISTERED
                entrez_gi = findXREF(entrez_gi, entrezgene_db_id)
                if entrez_gi == None:
                    raise Exception("ENTREZ ID not found at database.")

                #GET THE SYNONYMS IN A LIST(IF ANY)
                if synonyms == "-":
                    gene_symbols=[]
                else:
                    gene_symbols = synonyms.split("|")

                #ADD A NEW ENTRY FOR EACH GENE SYMBOL
                gene_symbol = insertXREF(XREF_Entry(gene_symbol, refseq_gene_symbol_db_id, resource.get("description")))

                aux=[gene_symbol]
                for gene_symbol in gene_symbols:
                    gene_symbol = insertXREF(XREF_Entry(gene_symbol, refseq_gene_symbol_synonyms_db_id, resource.get("description")))
                    aux.append(gene_symbol)

                gene_symbols=aux

                #GET ALL THE TRANSCRIPT IDS ASSOCIATED WITH THE ENTREZ ID
                transcript_ids = xref2transcript.get(entrez_gi.getID(), [])

                #IF NO TRANSCRIPTS REMOVE THE ENTRIES AND FAIL (SHOULD NOT HAPPEN)
                if len(transcript_ids) == 0:
                    for gene_symbol in gene_symbols:
                        deleteXREF(gene_symbol)
                    raise Exception("No transcript ID associated for current ENTREZ ID.")

                #IF THERE IS AT LEAST ONE TRANSCRIPT, CREATE THE ASSOCIATIONS
                for transcript_id in transcript_ids:
                    for gene_symbol in gene_symbols:
                        insertTR_XREF(gene_symbol, transcript_id)

            except Exception as ex:
                errorMessage= "FAILED WHILE PROCESSING REFSEQ GENE SYMBOL MAPPING FILE [line " + str(i) + "]: "+ ex.message
                FAILED_LINES["REFSEQ GENE SYMBOL"].append([errorMessage] + row)

    csvfile.close()
    os.remove("/tmp/build.tmp")

    TOTAL_FEATURES["REFSEQ GENE SYMBOL"]=total_lines

    return total_lines


#**************************************************************************
#  _    _ _   _ _____ _____  _____   ____ _______
# | |  | | \ | |_   _|  __ \|  __ \ / __ \__   __|
# | |  | |  \| | | | | |__) | |__) | |  | | | |
# | |  | | . ` | | | |  ___/|  _  /| |  | | | |
# | |__| | |\  |_| |_| |    | | \ \| |__| | | |
#  \____/|_| \_|_____|_|    |_|  \_\\____/  |_|
#
#**************************************************************************
def processUniProtData():
    """
    # UNIPROT MAPPING FILE CONTAINS THE LOT OF COLUMNS
    # 1. UniProtKB-AC
    # 2. UniProtKB-ID
    # 3. GeneID (EntrezGene)
    # 4. RefSeq (Peptide)
    # 5. GI
    # 6. PDB
    # ...
    # 12. PIR
    # ...
    # 15. UniGene
    # ...
    # 19. Ensembl
    # 20. Ensembl_TRS
    # 21. Ensembl_PRO
    """
    FAILED_LINES["UNIPROT"]=[]
    stderr.write("\n\nPROCESSING UniProt MAPPING FILE...\n")

    resource = EXTERNAL_RESOURCES.get("uniprot")[0]
    file_name= DATA_DIR + "mapping/" + resource.get("output")
    if not os.path.isfile(file_name):
        stderr.write("\n\nUnable to find the UniProt MAPPING file: " + file_name + "\n")
        exit(1)

    #Extract the file in a temporal directory
    stderr.write("  * EXTRACTING FILE...\n")
    command = "gunzip -c  " + file_name + " > /tmp/build.tmp"
    check_call(command, shell=True)

    stderr.write("  * PROCESSING FILE...\n")
    #Get line count (for percentage)
    total_lines = int(check_output(['wc', '-l', '/tmp/build.tmp']).split(" ")[0])

    #Register databases and get the assigned IDs
    uniprot_acc_db_id = insertDatabase(DBNAME_Entry("uniprot_acc", "UniProt Accession", "Identifier"))
    uniprot_id_db_id = insertDatabase(DBNAME_Entry("uniprot_id", "UniProt Identifier", "Identifier"))
    ensembl_transcript_db_id = insertDatabase(DBNAME_Entry("ensembl_transcript", "Ensembl transcript", "Identifier"))
    refseq_peptide_predicted_db_id = insertDatabase(DBNAME_Entry("refseq_peptide_predicted", "RefSeq protein accession (predicted)", "Identifier"))
    refseq_peptide_curated_db_id = insertDatabase(DBNAME_Entry("refseq_peptide_curated", "RefSeq protein accession (curated)", "Identifier"))

    #Process files
    with open('/tmp/build.tmp', "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')
        i =0
        prev=-1
        errorMessage=""
        for row in rows:
            i+=1
            prev = showPercentage(i, total_lines, prev, errorMessage)
            errorMessage=""
            try:
                uniprot_acc = row[0]
                uniprot_id  = row[1]
                ref_prot_acc= row[3]
                ensembl_ti  = row[19]

                if ensembl_ti == "" and ref_prot_acc == "":
                    raise Exception("Empty UniProt transcript information.")

                uniprot_acc = insertXREF(XREF_Entry(uniprot_acc, uniprot_acc_db_id, resource.get("description")))
                uniprot_id  = insertXREF(XREF_Entry(uniprot_id, uniprot_id_db_id, resource.get("description")))

                transcript_ids = []
                if ensembl_ti != "":
                    ensembl_ti = ensembl_ti.replace(" ", "").split(";")
                    #FOR EACH TRANSCRIPT
                    for transcript_id in ensembl_ti:
                        #GET THE ID FOR THE ENTRY
                        transcript_id = findXREF(transcript_id, ensembl_transcript_db_id)
                        #IF THE TRANSCRIPT EXISTS
                        if transcript_id != None:
                            transcript_ids.append(transcript_id.getID())

                if ref_prot_acc != "":
                    ref_prot_acc = ref_prot_acc.replace(" ", "").split(";")
                    for peptide_acc in ref_prot_acc:
                        #GET THE ID FOR THE ENTRY
                        peptide_id = findXREF(peptide_acc, refseq_peptide_predicted_db_id)
                        if peptide_id == None:
                            peptide_id = findXREF(peptide_acc, refseq_peptide_curated_db_id)

                        if peptide_id != None:
                            # GET THE ASSOCIATED TRANSCRIPT ID FOR CURRENT PEPTIDE
                            transcript_ids += xref2transcript.get(peptide_id.getID(), [])

                #IF NO TRANSCRIPTS REMOVE THE ENTRIES AND FAIL (SHOULD NOT HAPPEN)
                if len(transcript_ids) == 0:
                    deleteXREF(uniprot_id)
                    deleteXREF(uniprot_acc)
                    raise Exception("UniProt transcripts are not in Database (possible retired transcripts)")

                #IF THERE IS AT LEAST ONE TRANSCRIPT, CREATE THE ASSOCIATIONS
                for transcript_id in transcript_ids:
                    insertTR_XREF(uniprot_id, transcript_id)
                    insertTR_XREF(uniprot_acc, transcript_id)
            except Exception as ex:
                errorMessage = "FAILED WHILE PROCESSING UNIPROT MAPPING FILE [line " + str(i) + "]: "+ ex.message
                FAILED_LINES["UNIPROT"].append([errorMessage] + row)

    csvfile.close()
    os.remove("/tmp/build.tmp")

    TOTAL_FEATURES["UNIPROT"]=total_lines

    return total_lines

#**************************************************************************
# __      ________ _____
# \ \    / /  ____/ ____|   /\
#  \ \  / /| |__ | |  __   /  \
#   \ \/ / |  __|| | |_ | / /\ \
#    \  /  | |___| |__| |/ ____ \
#     \/   |______\_____/_/    \_\
#
#**************************************************************************
def processVegaData():
    """
    #
    # ENSEMBL MAPPING FILE CONTAINS THE FOLLOWING COLUMNS
    # 1. Vega Gene ID
    # 2. EntrezGene ID
    # 3. Vega Protein ID
    # 4. Vega Transcript ID
    # 5. Ensembl Transcript ID
    """
    FAILED_LINES["VEGA"]=[]
    resource = EXTERNAL_RESOURCES.get("vega")[0]
    file_name= DATA_DIR + "mapping/" + resource.get("output")
    if not os.path.isfile(file_name):
        stderr.write("\n\nUnable to find the ENSEMBL VEGA MAPPING file: " + file_name + "\n")
        exit(1)

    #Get line count (for percentage)
    total_lines = int(check_output(['wc', '-l', file_name]).split(" ")[0])

    #Register databases and get the assigned IDs
    ensembl_transcript_db_id = insertDatabase(DBNAME_Entry("ensembl_transcript", "Ensembl transcript", "Identifier"))
    vega_transcript_db_id = insertDatabase(DBNAME_Entry("vega_transcript", "Vega transcript", "Identifier"))
    vega_gene_db_id = insertDatabase(DBNAME_Entry("vega_gene", "Vega gene", "Identifier"))
    vega_peptide_db_id = insertDatabase(DBNAME_Entry("vega_peptide", "Vega protein", "Identifier"))
    entrezgene_db_id = insertDatabase(DBNAME_Entry("entrezgene", "EntrezGene ID", "Identifier"))

    #Process files
    stderr.write("\n\nPROCESSING ENSEMBL Vega MAPPING FILE...\n")
    with open(file_name, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter=',')
        i =0
        prev=-1
        errorMessage=""

        for row in rows:
            i+=1
            prev = showPercentage(i, total_lines, prev, errorMessage)
            try:
                vega_gi = row[0]
                entrez_gi = row[1]
                vega_pi = row[2]
                vega_ti = row[3]
                ensembl_ti = row[4]

                if ensembl_ti == "": #ALWAYS FALSE
                    raise Exception("Empty ENSEMBL Vega transcript value.")

                ensembl_ti = insertXREF(XREF_Entry(ensembl_ti, ensembl_transcript_db_id, resource.get("description")))
                #TODO: IF TI NOT IN DB?

                if vega_ti != "": #ALWAYS TRUE
                    vega_ti = insertXREF(XREF_Entry(vega_ti, vega_transcript_db_id, resource.get("description")))
                    insertTR_XREF(vega_ti, ensembl_ti)

                if vega_gi != "": #ALWAYS TRUE
                    vega_gi = insertXREF(XREF_Entry(vega_gi, vega_gene_db_id, resource.get("description")))
                    insertTR_XREF(vega_gi, ensembl_ti)

                if entrez_gi != "":
                    entrez_gi = insertXREF(XREF_Entry(entrez_gi, entrezgene_db_id, resource.get("description")))
                    insertTR_XREF(entrez_gi, ensembl_ti)

                if vega_pi != "":
                    vega_pi = insertXREF(XREF_Entry(vega_pi, vega_peptide_db_id, resource.get("description")))
                    insertTR_XREF(vega_pi, ensembl_ti)

            except Exception as ex:
                errorMessage = "FAILED WHILE PROCESSING ENSEMBL VEGA MAPPING FILE [line " + str(i) + "]: "+ ex.message
                FAILED_LINES["VEGA"].append([errorMessage] + row)
    csvfile.close()

    TOTAL_FEATURES["VEGA"]=total_lines

    return total_lines

#**************************************************************************
#  _  ________ _____  _____
# | |/ /  ____/ ____|/ ____|
# | ' /| |__ | |  __| |  __
# |  < |  __|| | |_ | | |_ |
# | . \| |___| |__| | |__| |
# |_|\_\______\_____|\_____|
#
#**************************************************************************
def processKEGGMappingData():
    """
    # KEGG MAPPING FILE CONTAINS THE FOLLOWING COLUMNS
    # WE USE THIS FUNCTION WHEN NO EXTERNAL DATA IS AVAILABLE
    # 1. EXTERNAL DB ID (uniprot acc, entrezid,...)
    # 2. KEGG DB ID (entrezid, Ensembl id...)
    """
    #STEP 1. Register databases and get the assigned IDs
    random_transcript_db_id = insertDatabase(DBNAME_Entry("random_transcript_db_id", "Random transcripts (not real)", "Identifier"))
    uniprot_acc_db_id = insertDatabase(DBNAME_Entry("uniprot_acc", "UniProt Accession", "Identifier"))
    ncbi_geneid_db_id = insertDatabase(DBNAME_Entry("ncbi_geneid", "NCBI Gene ID", "Identifier"))
    # ncbi_gi_db_id = insertDatabase(DBNAME_Entry("ncbi_gi", "NCBI GI ID", "Identifier"))
    kegg_id_db_id = insertDatabase(DBNAME_Entry("kegg_id", "KEGG Feature ID", "Identifier"))
    kegg_gene_symbol_db_id = insertDatabase(DBNAME_Entry("kegg_gene_symbol", "KEGG Gene Symbol", "Identifier"))
    kegg_gene_symbol_synonyms_db_id = insertDatabase(DBNAME_Entry("kegg_gene_symbol_synonyms", "KEGG Gene Symbol Synonyms", "Identifier"))

    total_lines=[0,0,0]

    #STEP 2. READ THE UniProt 2 KEGG FILE
    file_name= DATA_DIR + "mapping/" + "uniprot2kegg.list"
    if not os.path.isfile(file_name):
        stderr.write("\n\nUnable to find the UNIPROT 2 KEGG MAPPING file: " + file_name + "\n")
    else:
        processKEGGMappingDataAUX("UNIPROT 2 KEGG", file_name, uniprot_acc_db_id, kegg_id_db_id, random_transcript_db_id, "up:")

    #STEP 3. READ THE NCBI Gene ID 2 KEGG FILE
    file_name= DATA_DIR + "mapping/" + "ncbi-geneid2kegg.list"
    if not os.path.isfile(file_name):
        stderr.write("\n\nUnable to find the NCBI Gene ID 2 KEGG MAPPING file: " + file_name + "\n")
    else:
        processKEGGMappingDataAUX("NCBI Gene ID 2 KEGG", file_name, ncbi_geneid_db_id, kegg_id_db_id, random_transcript_db_id, "ncbi-geneid:")

    #STEP 4. READ THE NCBI GI 2 KEGG FILE
    # file_name= DATA_DIR + "mapping/" + "ncbi-gi2kegg.list"
    # if not os.path.isfile(file_name):
    #     stderr.write("\n\nUnable to find the NCBI GI 2 KEGG MAPPING file: " + file_name + "\n")
    # else:
    #     processKEGGMappingDataAUX("NCBI GI 2 KEGG", file_name, ncbi_gi_db_id, kegg_id_db_id, random_transcript_db_id, "ncbi-gi:")

    #STEP 4. READ THE KEGG 2 GENE SYMBOL FILE
    file_name= DATA_DIR + "mapping/" + "kegg2genesymbol.list"
    if not os.path.isfile(file_name):
        stderr.write("\n\nUnable to find the KEGG 2 GENE SYMBOL MAPPING file: " + file_name + "\n")
    else:
        processKEGG2GeneSymbolMappingData("KEGG 2 GENE SYMBOL", file_name, kegg_gene_symbol_db_id, kegg_gene_symbol_synonyms_db_id, kegg_id_db_id, random_transcript_db_id)

    kegg_id_2_refseq_tid.clear()

    return total_lines

def processKEGGMappingDataAUX(display_file_name, file_name, current_db_id, kegg_id_db_id, transcripts_db_id, prefix):
    #Get line count (for percentage)
    total_lines = int(check_output(['wc', '-l', file_name]).split(" ")[0])

    #Process files
    stderr.write("\n\nPROCESSING " + display_file_name +" MAPPING FILE...\n")
    with open(file_name, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')
        i =0
        prev=-1
        errorMessage=""

        for row in rows:
            i+=1
            prev = showPercentage(i, total_lines, prev, errorMessage)
            try:
                external_gi  = row[0].replace(prefix, "")
                kegg_gi      = row[1].replace(SPECIE + ":", "")

                external_gi = insertXREF(XREF_Entry(external_gi, current_db_id, "Extracted from KEGG Database (" + display_file_name + " file)"))
                kegg_gi = insertXREF(XREF_Entry(kegg_gi, kegg_id_db_id, "Extracted from KEGG Database (" + display_file_name + " file)"))

                transcript_id= kegg_id_2_refseq_tid.get(kegg_gi, generateRandomID()) #Try to reuse the ids for random transcripts
                kegg_id_2_refseq_tid[kegg_gi] = transcript_id

                insertTR_XREF(external_gi, transcript_id)
                insertTR_XREF(kegg_gi, transcript_id)

            except Exception as ex:
                errorMessage = "FAILED WHILE PROCESSING " + display_file_name +" MAPPING FILE [line " + str(i) + "]: "+ ex.message
    csvfile.close()

    return total_lines

def processKEGG2GeneSymbolMappingData(display_file_name, file_name, kegg_gene_symbol_db_id, kegg_gene_symbol_synonyms_db_id, kegg_id_db_id, transcripts_db_id):
    #Get line count (for percentage)
    total_lines = int(check_output(['wc', '-l', file_name]).split(" ")[0])

    #Process files
    stderr.write("\n\nPROCESSING " + display_file_name +" MAPPING FILE...\n")
    with open(file_name, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')
        i =0
        prev=-1
        errorMessage=""

        for row in rows:
            i+=1
            prev = showPercentage(i, total_lines, prev, errorMessage)
            try:
                kegg_gi      = row[0].replace(SPECIE + ":", "")
                gene_symbol  = row[1]

                gene_symbol = gene_symbol.split(";")
                if len(gene_symbol) < 2: #it means that the line only contains a description, not a gene symbol
                    continue

                gene_synonyms = gene_symbol[0].split(", ") #COULD BE A LIST OF GENE SYMBOLS
                gene_symbol   = gene_synonyms.pop(0)

                if len(gene_symbol) > 15: #discard long ids -> could be a description
                    continue

                kegg_gi = insertXREF(XREF_Entry(kegg_gi, kegg_id_db_id, "Extracted from KEGG Database (" + display_file_name + " file)"))
                gene_symbol = insertXREF(XREF_Entry(gene_symbol, kegg_gene_symbol_db_id, "Extracted from KEGG Database (" + display_file_name + " file)"))

                gene_synonyms_aux=[gene_symbol]
                for gene_symbol in gene_synonyms:
                    gene_synonyms_aux.append(insertXREF(XREF_Entry(gene_symbol, kegg_gene_symbol_synonyms_db_id, "Extracted from KEGG Database (" + display_file_name + " file)")))

                transcript_id= kegg_id_2_refseq_tid.get(kegg_gi, generateRandomID()) #Try to reuse the ids for random transcripts
                kegg_id_2_refseq_tid[kegg_gi] = transcript_id

                insertTR_XREF(kegg_gi, transcript_id)
                for gene_symbol in gene_synonyms_aux:
                    insertTR_XREF(gene_symbol, transcript_id)

            except Exception as ex:
                errorMessage = "FAILED WHILE PROCESSING " + display_file_name +" MAPPING FILE [line " + str(i) + "]: "+ ex.message
    csvfile.close()

    return total_lines

def processKEGGCommonData(dirName, ROOT_DIRECTORY):
    #STEP1. PROCESS KEGG COMPOUND DATA
    processKEGG2CompoundSymbolMappingData(dirName + "compounds_all.list")

    #STEP2. PROCESS ALL SPECIES FILES
    stderr.write("\nPROCESSING AVAILABLE SPECIES FILE...\n")
    file_name = dirName + "organisms_all.list"

    SPECIES_AUX={}
    with open(file_name, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')
        for row in rows:
            SPECIES_AUX[row[2]] = {"value": row[1], "name": row[2]}
    csvfile.close()

    SPECIES=[]
    for specie_name in sorted(SPECIES_AUX.keys()):
        SPECIES.append(SPECIES_AUX.get(specie_name))

    SPECIES = {"success": True, "species": SPECIES}
    csvfile = open(ROOT_DIRECTORY + "public_html/resources/data/all_species.json", 'w')
    csvfile.write(json.dumps(SPECIES, separators=(',',':')) + "\n")
    csvfile.close()

    stderr.write("\nPROCESSING VERSIONS FILE...\n")
    #STEP3. PROCESS VERSION FILE
    file_name= dirName + "/VERSION"
    file = open(file_name, 'r')
    ALL_VERSIONS["COMMON"] = {"name" : "COMMON", "date" : file.readline().rstrip().split("\t")[1]}
    file.close()

    stderr.write("\nDUMP FILES...\n")
    #STEP4. DUMP VERSION INFO
    file = open("/tmp/versions.tmp", 'w')
    for elem in ALL_VERSIONS.values():
        file.write(json.dumps(elem, separators=(',',':')) + "\n")
    file.close()

    #STEP4. CREATE DATABASES
    stderr.write("\nCREATING GLOBAL DATABASES...\n")
    createGlobalDatabase()

def processKEGG2CompoundSymbolMappingData(file_name):
    #Get line count (for percentage)
    total_lines = int(check_output(['wc', '-l', file_name]).split(" ")[0])
    KEGG_COMPOUNDS = []

    #STEP 1. Process files
    stderr.write("\n\nPROCESSING KEGG 2 Compound MAPPING FILE...\n")
    with open(file_name, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')
        i =0
        prev=-1
        errorMessage=""

        for row in rows:
            i+=1
            #prev = showPercentage(i, total_lines, prev, errorMessage)
            try:
                kegg_id      = row[0].replace("cpd:", "")
                compound_symbols  = row[1]

                compound_symbols = compound_symbols.split("; ")
                for compound_symbol in compound_symbols:
                    KEGG_COMPOUNDS.append({"id" : kegg_id, "name" : compound_symbol.lstrip()})

            except Exception as ex:
                errorMessage = "FAILED WHILE PROCESSING KEGG 2 Compound MAPPING FILE [line " + str(i) + "]: "+ ex.message
    csvfile.close()

    #STEP 2. DUMP THE TABLE INTO A FILE
    file = open("/tmp/compounds.tmp", 'w')
    for elem in KEGG_COMPOUNDS:
        file.write(json.dumps(elem, separators=(',',':')) + "\n")
    file.close()

    return total_lines

def processKEGGPathwaysData():
    FAILED_LINES["KEGG PATHWAYS"] = []

    #STEP 1. PROCESS THE pathways.list FILE
    file_name= DATA_DIR + "pathways.list"
    file = open(file_name, 'r')
    for line in file:
        line = line.rstrip().split("\t")
        pathway_id   = line[0].replace("path:","")
        pathway_name = line[1]
        pathway_name = pathway_name[0:pathway_name.rfind(" - ")]

        ALL_PATHWAYS[pathway_id] = {"ID": pathway_id, "name": pathway_name, "classification": set([]), "genes":[], "compounds":[], "relatedPathways":[] }

    file.close()

    #STEP 2. PROCESS THE pathways_classification.list FILE
    file_name= DATA_DIR + "../../pathways_classification.list"
    file = open(file_name, 'r')
    mainClassification=""; secondClassification="";
    for line in file:
        line = line.rstrip().split("  ")

        if line[0][0] == "A": #main classification
            mainClassification=line[0][1:]
        elif line[0][0] == "B":
            secondClassification = line[1]
        elif line[0][0] == "C":
            pathway_id   = line[2]
            if ALL_PATHWAYS.has_key(SPECIE + pathway_id):
                ALL_PATHWAYS[SPECIE + pathway_id]["classification"] = mainClassification + ";" + secondClassification
    file.close()

    #STEP 3. PROCESS ALL THE KGML FILES
    i =0; prev=-1; errorMessage=""; total_lines= len(ALL_PATHWAYS.keys())
    for pathway_id in ALL_PATHWAYS.keys():
        i+=1
        prev = showPercentage(i, total_lines, prev, errorMessage)
        #FOR EACH PATHWAY READ THE XML DATA
        file_name= DATA_DIR + "kgml/" + pathway_id +".kgml"
        try:
            import xml.etree.ElementTree as XMLParser
            pathwayInfoXML = XMLParser.parse(file_name)
            root = pathwayInfoXML.getroot()
            already_added = {}
            #FOR EACH NODE IN THE XML FILE
            for child in root:
                try:
                    entryType =  child.get("type")

                    if (entryType == "compound") or (entryType == "gene"):
                        graphicInfo = child.find("graphics")
                        featureIDList = child.get("name").split(" ")
                        entry = {
                            "id"     : "",
                            "x"      : graphicInfo.get("x"),
                            "y"      : graphicInfo.get("y"),
                            "height" : graphicInfo.get("height"),
                            "width"  : graphicInfo.get("width")
                        }

                        for featureID in featureIDList:
                            if (entryType == "compound") and not already_added.has_key(featureID):
                                entryAux = entry.copy()
                                entryAux["id"] = featureID.replace("cpd:","")
                                ALL_PATHWAYS[pathway_id]["compounds"].append(entryAux)
                                already_added[featureID] = 1
                            elif(entryType == "gene") and not already_added.has_key(featureID):
                                entryAux = entry.copy()
                                entryAux["id"] = featureID.replace(SPECIE + ":","")
                                ALL_PATHWAYS[pathway_id]["genes"].append(entryAux)
                                already_added[featureID] = 1
                    elif (entryType == "map"):
                        graphicInfo = child.find("graphics")
                        pathAuxID = child.get("name").replace("path:", "").replace(SPECIE,"")
                        if pathway_id != SPECIE + pathAuxID:
                            entry = {
                                "id"     : pathAuxID,
                                "name"   : graphicInfo.get("name"),
                                "x"      : graphicInfo.get("x"),
                                "y"      : graphicInfo.get("y"),
                                "height" : graphicInfo.get("height"),
                                "width"  : graphicInfo.get("width")
                            }
                            ALL_PATHWAYS[pathway_id]["relatedPathways"].append(entry)


                except Exception as ex:
                    errorMessage = "FAILED WHILE PROCESSING PATHWAY KGML FILE [" + file_name + "]: " + ex.message
                    FAILED_LINES["KEGG PATHWAYS"].append([errorMessage])

        except Exception as ex:
            errorMessage = "FAILED WHILE PROCESSING PATHWAY KGML FILE [" + file_name + "]: " + ex.message

    TOTAL_FEATURES["KEGG PATHWAYS"]=total_lines

    generatePathwaysNetwork(ALL_PATHWAYS)

    #STEP 4. PROCESS THE VERSION FILES
    file_name= DATA_DIR + "KEGG_VERSION"
    file = open(file_name, 'r')
    ALL_VERSIONS["KEGG"] = {"name" : "KEGG", "date" : file.readline().rstrip().split("\t")[1]}
    file.close()

    file_name= DATA_DIR + "mapping/MAP_VERSION"
    file = open(file_name, 'r')
    ALL_VERSIONS["MAPPING"] = {"name" : "MAPPING", "date" : file.readline().rstrip().split("\t")[1]}
    file.close()

def generatePathwaysNetwork(ALL_PATHWAYS):
    NODES = {}
    EDGES = []

    #***********************************************************************************
    #* STEP 1. FIRST PROCESS THE FILE WITH ALL PATHWAYS AND GENERATE A DIAGONAL MATRIX
    #          mmu00100 -> [ mmu00101 = 0, mmu00102 = 0, mmu00103 = 0,...]
    #          mmu00101 -> [               mmu00102 = 0, mmu00103 = 0,...]
    #          mmu00102 -> [                             mmu00103 = 0,...]
    #***********************************************************************************
    file_name = DATA_DIR + "../../pathways_all.list"
    with open(file_name, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')
        for row in rows:
            path_id = row[0].replace("path:map","")
            path_name = row[1]
            NODES[path_id] = {"data": {"id": SPECIE + path_id, "label": path_name, "total_features": 0}, "group" : "nodes"}
    csvfile.close()
    all_pathways = sorted(NODES.keys())

    pathways_matrix = {}
    while len(all_pathways) > 0:
        current_path = all_pathways[0]
        del all_pathways[0]
        pathways_matrix[current_path] = dict(zip(all_pathways, [0]*len(all_pathways)))

    #***********************************************************************************
    #* STEP 2. PROCESS THE PATHWAYS CLASSIFICATION FILE AND ADD THE PARENT NODES AND UPDATE
    #          THE PATHWAYS parent FIELD
    #***********************************************************************************
    file_name= DATA_DIR + "../../pathways_classification.list"
    csvfile = open(file_name, 'r')
    mainClassification=""; secondClassification=""
    mainClassificationID=0; secondClassificationID=0
    for line in csvfile:
        line = line.rstrip().split("  ")
        if line[0][0] == "A": #main classification
            mainClassificationID+=1
            mainClassification=line[0][1:]
            NODES[str(mainClassificationID) + "A"] = {"data": {"id": mainClassification.lower().replace(" ","_"), "label": mainClassification, "is_classification" : "A"}, "group" : "nodes"}
        elif line[0][0] == "B":
            secondClassificationID+=1
            secondClassification = line[1]
            NODES[str(secondClassificationID) + "B"] = {"data": {"id": secondClassification.lower().replace(" ","_"), "parent" : mainClassification.lower().replace(" ","_"), "label": secondClassification, "is_classification" : "B"}, "group" : "nodes"}
        elif line[0][0] == "C":
            pathway_id   = line[2]
            NODES[pathway_id]["data"]["parent"] = mainClassification.lower().replace(" ","_"),

    csvfile.close()
    #***********************************************************************************
    #* STEP 3. PROCESS THE FILE WITH THE RELATION GENE ID -> PATHWAY ID AND FILL THE MATRIX
    #          WITH THE NUMBER OF SHARED GENES
    #          mmu00100 -> [ mmu00101 = 1, mmu00102 = 0, mmu00103 = 0,...]
    #          mmu00101 -> [               mmu00102 = 5, mmu00103 = 3,...]
    #          mmu00102 -> [                             mmu00103 =20,...]
    #***********************************************************************************
    file_name = DATA_DIR + "gene2pathway.list"
    previous_gene=""
    associated_paths=set()
    with open(file_name, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')

        for row in rows:
            gene_id = row[0]
            path_id = row[1].replace("path:" + SPECIE, "")

            if gene_id != previous_gene:
                associated_paths = sorted(associated_paths)
                while len(associated_paths) > 0:
                    current_path = associated_paths[0]
                    del associated_paths[0]
                    for other_path in  associated_paths:
                        try:
                            pathways_matrix[current_path][other_path] += 1
                        except:
                            stderr.write("Pathways " + current_path + " or " + other_path + " not found at pathways_all.list. Updating common KEGG information may solve this issue. Reinstall this specie after that.\n")


                associated_paths=set([])

            associated_paths.add(path_id)
            previous_gene = gene_id

        #LAST PATHWAY
        associated_paths = sorted(associated_paths)
        while len(associated_paths) > 0:
            current_path = associated_paths[0]
            del associated_paths[0]
            for other_path in  associated_paths:
                try:
                    pathways_matrix[current_path][other_path] += 1
                except:
                    stderr.write("Pathways " + current_path + " or " + other_path + " not found at pathways_all.list. Updating common KEGG information may solve this issue. Reinstall this specie after that.\n")

    csvfile.close()

    #***********************************************************************************
    #* STEP 4. GET THE NUMBER OF GENES FOR EACH PATHWAY
    #***********************************************************************************
    file_name = DATA_DIR + "pathway2gene.list"
    previous_pathway=""
    nGenes = 0
    with open(file_name, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')
        for row in rows:
            path_id = row[0].replace("path:" + SPECIE, "")
            gene_id = row[1]
            if path_id != previous_pathway and previous_pathway!= "":
                try:
                    NODES[previous_pathway]["data"]["total_features"] += nGenes
                except:
                    stderr.write("No nodes information for Pathway " + previous_pathway + "Updating common KEGG information may solve this issue. Reinstall this specie after that.\n")
                nGenes=0
            nGenes+=1
            previous_pathway = path_id
        #LAST PATHWAY
        NODES[previous_pathway]["data"]["total_features"] += nGenes
    csvfile.close()

    #***********************************************************************************
    #* STEP 5. BULK THE MATRIX INTO JSON:
    #          FOR EACH PATHWAY ID AND FOR EACH POSITION WITH NON ZERO (SHARE AT LEAST 1 GENE), CREATE AN EDGE
    #***********************************************************************************
    already_linked_pathways={}
    for path_id, shared_genes in pathways_matrix.iteritems():
        #First create the edges based on the links between networks (extracted from KGML files)
        if ALL_PATHWAYS.has_key(SPECIE + path_id):
            relatedPathways = ALL_PATHWAYS[SPECIE + path_id]["relatedPathways"]
            for other_path_id in relatedPathways:
                if not already_linked_pathways.has_key(path_id + "-" + other_path_id["id"]):
                    EDGES.append({"data": {"id": path_id + "-" + other_path_id["id"], "source": SPECIE + path_id, "target": SPECIE + other_path_id["id"], "weight": 1, "class": 'l'}, "group":"edges"})
                    #Avoid repeated edges (including the opposite links)
                    already_linked_pathways[path_id + "-" + other_path_id["id"]] = 1
                    already_linked_pathways[other_path_id["id"]+ "-" + path_id] = 1
        #Add the edges based on the existance of shared genes
        for other_path_id, n_shared_genes in shared_genes.iteritems():
            if n_shared_genes > 0:
                EDGES.append({"data": {"id": path_id + "-" + other_path_id, "source": SPECIE + path_id, "target": SPECIE + other_path_id, "weight": n_shared_genes, "class": 's'}, "group":"edges"})

    #***********************************************************************************
    #* STEP 6 SAVE THE NETWORK TO A FILE
    #***********************************************************************************
    network = {
        "nodes": NODES.values(),
        "edges": EDGES
    }
    csvfile = open(DATA_DIR + "pathways_network.json", 'w')
    csvfile.write(json.dumps(network, separators=(',',':')) + "\n")
    csvfile.close()

#**************************************************************************
# OTHER DATABASES
#**************************************************************************
def printResults():
    stderr.write("\n\n\n")
    stderr.write("\nVALID FEATURES LINES    : " + str(len(ALL_ENTRIES)))
    for key, value in FAILED_LINES.iteritems():
        stderr.write("\nERRONEOUS " + key + " LINES : " + str(len(value)) + " of " + str(TOTAL_FEATURES[key]) + " [" + str(int(len(value)/float(TOTAL_FEATURES[key])*100)) +"%]")

    stderr.write("\n\n")

def dumpDatabase():
    #STEP1. GENERATE THE TABLE feature id --> [transcripts ids]
    xref2xref = {}
    for transcriptID, value in transcript2xref.iteritems():
        for feature_id in value:
            xref2xref[feature_id]=xref2xref.get(feature_id, set([])).union(value)

    #STEP 2. DUMP THE xref TABLE INTO A FILE
    file = open("/tmp/xref.tmp", 'w')

    for elem in xref.values():
        item = elem.__dict__
        item["mates"] = list(xref2xref.get(elem.getID(), []))

        if(len(item["mates"])> 0):
            file.write(json.dumps(item, separators=(',',':')) + "\n")
        else:
            stderr.write("No transcripts detected for " + elem.display_id + "["+ elem.description + "]\n")

    file.close()

    #STEP 2. DUMP THE transcript2xref TABLE INTO A FILE
    file = open("/tmp/dbname.tmp", 'w')

    for elem in dbname.values():
        file.write(json.dumps(elem.__dict__, separators=(',',':')) + "\n")
    file.close()

    #STEP 3. DUMP THE pathways TABLE INTO A FILE
    file = open("/tmp/pathways.tmp", 'w')

    for elem in ALL_PATHWAYS.values():
        file.write(json.dumps(elem, separators=(',',':')) + "\n")
    file.close()

    #STEP 4. DUMP THE VERSIONS TABLE INTO A FILE
    file = open("/tmp/versions.tmp", 'w')
    for elem in ALL_VERSIONS.values():
        file.write(json.dumps(elem, separators=(',',':')) + "\n")
    file.close()

def dumpErrors():
    #STEP 1. DUMP THE ERROR TABLE INTO A FILE
    file = open("/tmp/errors.tmp", 'w')

    try:
        for key, value in FAILED_LINES.iteritems():
            if len(value) > 0:
                file.write("#************************************\n#\n# " + key + "\n#\n#************************************\n")
                for line in value:
                    file.write(line[0] + "\n")
                    file.write("\t" + "\t".join(line[1:]) + "\n")
                file.write("\n\n\n")
    except Exception as ex:
        raise ex
    finally:
        file.close()

def createDatabase():
    try:
        command = "mongoimport --db " + SPECIE + "-paintomics --collection xref  --drop --file /tmp/xref.tmp"
        check_call(command, shell=True)

        command = "mongoimport --db " + SPECIE + "-paintomics --collection dbname  --drop --file /tmp/dbname.tmp"
        check_call(command, shell=True)

        command = "mongoimport --db " + SPECIE + "-paintomics --collection kegg  --drop --file /tmp/pathways.tmp"
        check_call(command, shell=True)

        command = "mongoimport --db " + SPECIE + "-paintomics --collection versions  --drop --file /tmp/versions.tmp"
        check_call(command, shell=True)

        from pymongo import MongoClient, ASCENDING
        from conf.serverconf import MONGODB_HOST, MONGODB_PORT
        client = MongoClient(MONGODB_HOST, MONGODB_PORT)

        db = client[SPECIE + "-paintomics"]

        db.xref.create_index([("dbname_id", ASCENDING),("_id", ASCENDING)])
        db.xref.create_index([("display_id", ASCENDING)])

    except CalledProcessError as ex:
        raise ex
    except Exception as ex:
        raise ex

def createGlobalDatabase():
    try:
        command = "mongoimport --db global-paintomics --collection kegg_compounds  --drop --file /tmp/compounds.tmp"
        check_call(command, shell=True)

        command = "mongoimport --db global-paintomics --collection versions  --drop --file /tmp/versions.tmp"
        check_call(command, shell=True)


        from pymongo import MongoClient, ASCENDING
        from conf.serverconf import MONGODB_HOST, MONGODB_PORT
        client = MongoClient(MONGODB_HOST, MONGODB_PORT)
        db = client["global-paintomics"]
        db.kegg_compounds.create_index([("name", ASCENDING)])

    except CalledProcessError as ex:
        raise ex
    except Exception as ex:
        raise ex

def queryBiomart(URL, fileName, outputName, delay, maxTries):
    stderr.write("DOWNLOADING FROM " + URL + "\n")
    nTry = 1
    while nTry <= maxTries:
        wait(delay)
        try:
            check_call(["curl", "--connect-timeout", "300", "--max-time", "900", "--data-urlencode", "query@" + fileName, URL, "-o", outputName])
            return True
        except Exception as e:
            nTry+=1
    raise Exception('Unable to retrieve ' + fileName + " from " + URL + "\n")

def downloadFile(URL, fileName, outputName, delay, maxTries):
    stderr.write("DOWNLOADING " + URL + fileName + "\n")
    nTry = 1
    while nTry <= maxTries:
        wait(delay)
        try:
            check_call(["curl", "--connect-timeout", "300", "--max-time", "900",  URL + fileName, "-o", outputName])
            return True
        except Exception as e:
            nTry+=1
    raise Exception('Unable to retrieve ' + fileName + " from " + URL + "\n")

def wait(nSeconds):
    sleep(nSeconds)

class SetEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        return json.JSONEncoder.default(self, obj)

#**************************************************************************
# VARIABLE DECLARATION
#**************************************************************************
#Temporal representation for XREF TABLES
xref = {}
transcript2xref= {}
xref2transcript = {}
dbname = {}

#STORE ALL ENTRIES TO BE SAVED
ALL_ENTRIES = {}
ALL_DBS = {}
ALL_PATHWAYS={}
ALL_VERSIONS={}

#OTHER AUXILIAR TABLES OR VARIABLES
TOTAL_FEATURES={}
FAILED_LINES={}

DATA_DIR= ""
SPECIE  =""
EXTERNAL_RESOURCES = None

kegg_id_2_refseq_tid = {}
