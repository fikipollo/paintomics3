#!/usr/bin/python
# -*- coding: utf-8 -*-
# Author: Pedro Furió Tarí

import getopt
import sys
import os.path
import gzip

# Global variables
rules       = ["TSS","1st_EXON","PROMOTER","INTRON","GENE_BODY","UPSTREAM","DOWNSTREAM"]
perc_area   = 90
perc_region = 50
tss         = 200.0
promotor    = 1300.0
distance    = 10000
level       = "exon"
gene_id_tag = "gene_id"
tran_id_tag = "transcript_id"

class Mygenes:
    def __init__(self, gene, start, end, strand, transcript, exon):
        self.gene = gene
        self.start = start
        self.end = end
        self.strand = strand
        self.transcript = transcript
        self.exon = exon

    def getGene(self):
        return self.gene

    def getStart(self):
        return self.start

    def getEnd(self):
        return self.end

    def getStrand(self):
        return self.strand

    def getTranscript(self):
        return self.transcript

    def getExon(self):
        return self.exon

    def setExon(self, exon_number):
        self.exon = exon_number


class Mytranscripts:
    def __init__(self):
        self.mygene = []

    def addGene(self, mygene):
        return self.mygene.append(mygene)

    def getExons(self):
        return len (self.mygene)

    # Just to rename exon numbers on the negative strand because some GTFs have it wrong tagged
    def checkExonNumbers(self):
        # Only applies to negative stranded transcripts
        if self.mygene[0].getStrand() == "+":
            return

        self.mygene = sorted(self.mygene, key=lambda tup:tup.getStart())

        n_exons = self.getExons()
        for gene in self.mygene:
            gene.setExon(str(n_exons))
            n_exons = n_exons - 1


def main():
    try:
        opts, args = getopt.getopt(sys.argv[1:], "hg:b:o:q:r:t:p:R:v:w:G:T:", ["help", "gtf=", "bed=", "output=", "distance=", "report=", "tss=", "promoter=", "rules=", "perc_area=", "perc_region=", "gene=","transcript="])
    except getopt.GetoptError as err:
        print(err) # will print something like "option -a not recognized"
        usage()
        sys.exit(2)

    gtf = None
    dhs = None
    outputfile = None

    global perc_area
    global perc_region
    global tss
    global promotor
    global distance
    global level
    global gene_id_tag
    global tran_id_tag

    for o, a in opts:
        if o in ("-h","--help"):
            usage()
            sys.exit()
        elif o in ("-g", "--gtf"):
            if os.path.isfile(a):
                gtf = a
            else:
                sys.stderr.write("\nERROR: GTF file not recognized.\n")
                usage()
                sys.exit()
        elif o in ("-b", "--bed"):
            if os.path.isfile(a):
                dhs = a
            else:
                sys.stderr.write("\nERROR: Region file not recognized.\n")
                usage()
                sys.exit()
        elif o in ("-o", "--output"):
            outputfile = a
        elif o in ("-G", "--gene"):
            gene_id_tag = a
        elif o in ("-T", "--transcript"):
            tran_id_tag = a
        elif o in ("-r", "--report"):
            if a.lower() in ["exon","transcript","gene"]:
                level = a.lower()
            else:
                sys.stderr.write("\nERROR: Report can only be one of the following: exon, transcript or gene.\n")
                usage()
                sys.exit()
        elif o in ("-q", "--distance"):
            aux = int(a)
            distance = aux*1000 if aux >= 0 else distance
        elif o in ("-t", "--tss"):
            tss = int(a)
        elif o in ("-p", "--promoter"):
            promotor = int(a)
        elif o in ("-R", "--rules"):
            if os.path.isfile(a) is False or readRules(a) is False:
                sys.stderr.write("\nERROR: Rules file not found or not in proper format.\n")
                usage()
                sys.exit()
        elif o in ("-v","--perc_area"):
            value = float(a)
            if 0 <= value <= 100:
                perc_area = value
            else:
                sys.stderr.write("\nERROR: The percentage of area defined was wrong. It should range between 0 and 100.\n")
                usage()
                sys.exit()           
        elif o in ("-w","--perc_region"):
            value = float(a)    
            if 0 <= value <= 100:
                perc_region = value
            else:
                sys.stderr.write("\nERROR: The percentage of region defined was wrong. It should range between 0 and 100.\n") 
                usage()
                sys.exit()
        else:
            assert False, "Unhandled option"

    if gtf is not None and dhs is not None and outputfile is not None:
        run(gtf, dhs, outputfile)
    else:
        usage()


def usage():
    print "\nUsage: python rgmatch.py [options] <mandatory>"
    print "Options:"
    print "\t-r, --report:\n\t\t Report at the 'exon', 'transcript' or 'gene' level. Default: 'exon'"
    print "\t-q, --distance:\n\t\t Maximum distance in kb to report associations. Default: 10 (10kb)"
    print "\t-t, --tss:\n\t\t TSS region distance. Default: 200 bps"
    print "\t-p, --promoter:\n\t\t Promoter region distance. Default: 1300 bps"
    print "\t-v, --perc_area:\n\t\t Percentage of the area of the gene overlapped to be considered to discriminate at transcript and gene level. Default: 90 (90%)"
    print "\t-w, --perc_region:\n\t\t Percentage of the region overlapped by the gene to be considered to discriminate at transcript and gene level. Default: 50 (50%)"
    print "\t-R, --rules:\n\t\t File containing the priorities in case of ties. Default: TSS,1st_EXON,PROMOTER,INTRON,GENE_BODY,UPSTREAM,DOWNSTREAM"
    print "\t-G, --gene:\n\t\t GTF tag used to get gene ids/names. Default: gene_id"
    print "\t-T, --transcript:\n\t\t GTF tag used to get transcript ids/names. Default: transcript_id"
    print "\t-h, --help:\n\t\t show this help message and exit"
    print "Mandatory:"
    print "\t-g, --gtf:\n\t\t Sorted GTF annotation file"
    print "\t-b, --bed:\n\t\t Sorted region bed file"
    print "\t-o, --output:\n\t\t Output file"
    print "\n16/06/2015. Pedro Furió Tarí.\n"


def readRules(myfile):
    global rules
    rules = []

    infile = open(myfile,'r')
    for option in infile:
        tag = option.split()[0]
        if tag in ["TSS","1st_EXON","PROMOTER","INTRON","GENE_BODY","UPSTREAM","DOWNSTREAM"] and tag not in rules:
            rules.append(tag)
    infile.close()

    # Check that we have stored all the possible tags in the proper order
    if len(rules) == 7:
        return True
    else:
        return False


def checkTSS(start, end, exon, distance):

    exon_start = exon.getStart()
    dhs_start = start
    dhs_end = end

    pm = (start + end)/2

    # If exon is in the negative strand, we will change the sign in order to make this code invariant to the strand
    if exon.getStrand() == "-":
        aux = dhs_end
        dhs_end = 2 * exon.getEnd() - dhs_start
        dhs_start = 2 * exon.getEnd() - aux
        exon_start = exon.getEnd()

    dhs_length = dhs_end - dhs_start + 1

    salida = []

    if distance <= tss:

        # UPSTREAM       PROMOTER        TSS          1st exon
        # ..........|................|..............|----------->

        if exon_start - dhs_start <= tss:
            # UPSTREAM       PROMOTER        TSS          1st exon
            # ..........|................|..............|----------->
            #                      DHS
            #                               |-------------


            pctg_dhs_200 = ((min (exon_start-1, dhs_end) - dhs_start + 1)/float(dhs_length))*100
            pctg_tss_200 = ((min (exon_start-1, dhs_end) - dhs_start + 1)/float(tss))*100
            tag = "TSS"
            # Report TSS
            salida.append([tag, distance, pctg_dhs_200, pctg_tss_200])
    
        else:
            # UPSTREAM       PROMOTER        TSS          1st exon
            # ..........|................|..............|----------->
            #                      DHS
            #                        --------------

            pctg_dhs_200 = ((min (exon_start-1, dhs_end) - (exon_start - tss) + 1)/float(dhs_length))*100
            pctg_tss_200 = ((min (exon_start-1, dhs_end) - (exon_start - tss) + 1)/float(tss))*100
            tag = "TSS"
            # Report TSS
            salida.append([tag, distance, pctg_dhs_200, pctg_tss_200])

            if exon_start - dhs_start <= (tss + promotor):
                # UPSTREAM       PROMOTER        TSS           1st exon
                # ..........|................|..............|----------->
                #                      DHS
                #                     |--------------|

                pctg_dhs_1500 = ((exon_start - tss - dhs_start ) / float(dhs_length))*100
                pctg_tss_1500 = ((exon_start - tss - dhs_start ) / float(promotor))*100
                tag = "PROMOTER"
                # Report PROMOTER
                salida.append([tag, distance, pctg_dhs_1500, pctg_tss_1500])

            else:
                # UPSTREAM       PROMOTER        TSS          1st exon
                # ..........|................|..............|----------->
                #                      DHS
                #       |---------------------------|
                pctg_dhs_1500 = (promotor / float(dhs_length))*100
                pctg_tss_1500 = 100
                tag = "PROMOTER"
                # Report PROMOTER
                salida.append([tag, distance, pctg_dhs_1500, pctg_tss_1500])

                pctg_dhs_upst = ((exon_start - tss - promotor - dhs_start) / float(dhs_length))*100
                pctg_tss_upst = -1
                tag = "UPSTREAM"
                # Report UPSTREAM
                salida.append([tag, distance, pctg_dhs_upst, pctg_tss_upst])

    elif  distance <= (tss + promotor):
        if exon_start - dhs_start <= (tss + promotor):
            # UPSTREAM       PROMOTER        TSS          1st exon
            # ..........|................|..............|----------->
            #                   DHS
            #                |--------|
            pctg_dhs_1500 = 100
            pctg_tss_1500 = (dhs_length/float(promotor))*100
            tag = "PROMOTER"
            # Report PROMOTER
            salida.append([tag, distance, pctg_dhs_1500, pctg_tss_1500])
            
        else:
            # UPSTREAM       PROMOTER        TSS          1st exon
            # ..........|................|..............|----------->
            #                   DHS
            #       |-------------|
            pctg_dhs_1500 = ((dhs_end - (exon_start - tss - promotor) + 1)/float(dhs_length))*100
            pctg_tss_1500 = ((dhs_end - (exon_start - tss - promotor) + 1)/float(promotor))*100
            tag = "PROMOTER"
            # Report PROMOTER
            salida.append([tag, distance, pctg_dhs_1500, pctg_tss_1500])

            pctg_dhs_upst = ((exon_start - tss - promotor - dhs_start) / float(dhs_length))*100
            pctg_tss_upst = -1
            tag = "UPSTREAM"
            # Report UPSTREAM
            salida.append([tag, distance, pctg_dhs_upst, pctg_tss_upst])
            
    else:
        pctg_dhs_upst = 100
        pctg_tss_upst = -1
        tag = "UPSTREAM"
        # Report UPSTREAM
        salida.append([tag, distance, pctg_dhs_upst, pctg_tss_upst])
        
    return salida


def reportOutput(myfinaloutput, dhs_id, start, end, outobj, metainfo):

    pm = (start + end)/2
    dhs_length = end - start + 1

    if level == "exon":
        # Report everything
        for pos in range(len(myfinaloutput)):
            myexon = myfinaloutput[pos][0]
            for relation in myfinaloutput[pos][1:]:
                outobj.write(dhs_id + "\t" + str(pm) + "\t" + myexon.getGene() + "\t" + myexon.getTranscript() + "\t" +
                    myexon.getExon() + "\t" + relation[0] + "\t" + str(relation[1]) + "\t" + str(relation[2]) +
                    "\t" + str(relation[3]) +  "\t" + "\t".join(metainfo)[:-1] + "\n")
    else:

        # Dictionary with positions where we can find a transcript in myfinaloutput
        # Example: { transcript1: [pos1, pos3], transcript2: [pos2]}
        mytranscripts = {}

        for pos in range(len(myfinaloutput)):
            transcript_id = myfinaloutput[pos][0].getTranscript()
            if transcript_id not in mytranscripts:
                mytranscripts[transcript_id] = [pos]
            else:
                mytranscripts[transcript_id].append(pos)


        # {TRANS2: { GENE_BODY: [Mygenes, n_exons, distance, dhs_pctg, area_pctg],
        #            INTRON: [Mygenes, n_exons, distance, dhs_pctg, area_pctg] ...
        #           },
        # {TRANS5: .... }}
        # This dictionary will replace myfinaloutput. It will contain the chosen relations for all transcripts.
        toreport = {}

        # Merge the cases of transcripts with more than 1 exon associated to gene body or intron
        for transcript_id in mytranscripts:

            # Check again the percentages
            positions = mytranscripts[transcript_id]
            # If we find an intron flag, we will report the intron line after calculating the percentages again properly
            intronFlag = False
            bodyFlag = False

            overlappedDHS_geneBody = 0   # Number of base pairs overlapped with DHS regions in gene_body (not 1st exon)
            exons_body_length = 0        # Total length of exons with any gene_body association to get the area (not 1st exon)
            n_exons = 0                  # Total number of exons of a transcript that are overlapped by the DHS region
            overlappedDHS_UPSTREAM = 0   # Number of base pairs overlapped with DHS regions upstream (TSS included)

            # [Mygenes, n_exons, distance, dhs_pctg, area_pctg, flag]
            transcript_annotation = {}   # Object we create to have a final summary merging gene_body annotations from
                                         # different exons of the same transcript, as well as merging intron reports
                                         # in just one line. Once we have this created, we will report based on the rules.

            for pos in positions:
                myexon = myfinaloutput[pos][0]

                #
                #      <----------------->
                # |-----------|
                #
                if myexon.getStart() > start and myexon.getEnd() >= end:
                    overlappedDHS_geneBody = overlappedDHS_geneBody + end - myexon.getStart() + 1
                    n_exons = n_exons - 1
                    exons_body_length = exons_body_length + myexon.getEnd() - myexon.getStart() + 1
                #
                #    <----------------->
                #               |-----------|
                #
                elif myexon.getStart() <= start and myexon.getEnd() < end:
                    overlappedDHS_geneBody = overlappedDHS_geneBody + myexon.getEnd() - start + 1
                    n_exons = n_exons - 1
                    exons_body_length = exons_body_length + myexon.getEnd() - myexon.getStart() + 1
                #
                #    <----------------->
                # |-----------------------|
                #
                elif myexon.getStart() > start and myexon.getEnd() < end:
                    overlappedDHS_geneBody = overlappedDHS_geneBody + myexon.getEnd() - myexon.getStart() + 1
                    n_exons = n_exons - 1
                    exons_body_length = exons_body_length + myexon.getEnd() - myexon.getStart() + 1

                # Check if there's an UPSTREAM/TSS annotation in order to take it also into account
                if myexon.getExon() == "1":
                    #
                    #      ----------------->
                    # |-----------|
                    if myexon.getStrand() == "+" and start < myexon.getStart():
                        overlappedDHS_UPSTREAM = overlappedDHS_UPSTREAM + myexon.getStart() - start + 1
                    #
                    #      <-----------------
                    #                 |-----------|
                    elif myexon.getStrand() == "-" and end > myexon.getEnd():
                        overlappedDHS_UPSTREAM = overlappedDHS_UPSTREAM + end - myexon.getEnd() + 1


                for relation in myfinaloutput[pos][1:]:

                    flag = relation[0]
                    distance = relation[1]
                    dhs_pctg = relation[2]
                    area_pctg = relation[3]

                    if flag != "INTRON" or flag != "GENE_BODY":
                        transcript_annotation[flag] = [myexon, 1, distance, dhs_pctg, area_pctg]
                    elif flag == "INTRON":
                        intronFlag = True
                    elif flag =="GENE_BODY":
                        bodyFlag = True

            if intronFlag is True:
                # Insert intron information
                dhs_pctg = ((dhs_length - (overlappedDHS_geneBody + overlappedDHS_UPSTREAM))/float(dhs_length)) * 100
                transcript_annotation["INTRON"] = [myexon, -1, 0, dhs_pctg, -1]
            if bodyFlag is True:
                # Insert gene_body
                dhs_pctg = (overlappedDHS_geneBody/float(dhs_length)) * 100
                area_pctg = (overlappedDHS_geneBody/float(exons_body_length)) * 100
                transcript_annotation["GENE_BODY"] = [myexon, -1, 0, dhs_pctg, area_pctg]

            # Check which of the associations in the current transcript has to be reported based on the rules
            area_winners = []
            dhs_winner = None
            max_dhs = 0
            for key in transcript_annotation:

                if transcript_annotation[key][3] > perc_region:
                    dhs_winner = key
                elif transcript_annotation[key][4] > perc_area:
                    area_winners.append(key)

            if dhs_winner is not None:
                # Check DHS
                transcript_annotation[dhs_winner].append(dhs_winner)
                toreport[transcript_id] = transcript_annotation[dhs_winner]
            else:
                # Check area
                # If we only have 1 exon with >perc_area% of its area overlapped

                dhs_winner = []

                if len(area_winners) == 1:
                    transcript_annotation[area_winners[0]].append(area_winners[0])
                    toreport[transcript_id] = transcript_annotation[area_winners[0]]

                    # If we have more than one candidate
                else:
                    # Check DHS
                    if len(area_winners) == 0:
                        # If we don't have any area winner, we get all the candidates again to check the region.
                        # Otherwise, we only will check the region of those area winners
                        area_winners = transcript_annotation.keys()

                    for transcript in area_winners:

                        if transcript_annotation[transcript][3] > max_dhs:
                            max_dhs = transcript_annotation[transcript][3]
                            dhs_winner = [transcript]
                        elif transcript_annotation[transcript][3] == max_dhs:
                            dhs_winner.append(transcript)

                    if len(dhs_winner) == 1:
                        winner_flag = dhs_winner[0]
                        transcript_annotation[winner_flag].append(winner_flag)
                        toreport[transcript_id] = transcript_annotation[winner_flag]
                    else:
                        # If we have a tie after following all the rules, we will apply the defined order in rules
                        for mytag in rules:
                            if mytag in dhs_winner:
                                transcript_annotation[mytag].append(mytag)
                                toreport[transcript_id] = transcript_annotation[mytag]
                                break

        if level == "transcript":
            # Report transcripts
            for transcript in toreport:
                # [Mygenes, n_exons, distance, dhs_pctg, area_pctg, flag]
                myexon    = toreport[transcript][0]
                n_exons   = toreport[transcript][1]
                distance  = toreport[transcript][2]
                dhs_pctg  = toreport[transcript][3]
                area_pctg = toreport[transcript][4]
                flag      = toreport[transcript][5]
                outobj.write(dhs_id + "\t" + str(pm) + "\t" + myexon.getGene() + "\t" + myexon.getTranscript() + "\t" +
                    str(n_exons) + "\t" + flag + "\t" + str(distance) + "\t" + str(dhs_pctg) +
                    "\t" + str(area_pctg) + "\t" + "\t".join(metainfo)[:-1] + "\n")

        else:
            # Find the best for each gene association
            mygenes = {} # {gene1: [[TSS_200, Mygenes], [GENE_BODY, Mygenes]], gene2: [TSS_200, Mygenes]}
            for transcript in toreport:
                myexon = toreport[transcript][0]
                gene_id = myexon.getGene()
                flag = toreport[transcript][5]
                if gene_id not in mygenes:
                    mygenes[gene_id] = [[flag, myexon]]
                else:
                    mygenes[gene_id].append([flag, myexon])

            # Look for the best candidates for each gene
            for gene_id in mygenes:
                myobject = mygenes[gene_id]
                if len(myobject) == 1:
                    # Report it
                    transcript = myobject[0][1].getTranscript()
                    myexon     = toreport[transcript][0]
                    n_exons    = toreport[transcript][1]
                    distance   = toreport[transcript][2]
                    dhs_pctg   = toreport[transcript][3]
                    area_pctg  = toreport[transcript][4]
                    flag       = toreport[transcript][5]
                    outobj.write(dhs_id + "\t" + str(pm) + "\t" + myexon.getGene() + "\t" + myexon.getTranscript() + "\t" +
                        str(n_exons) + "\t" + flag + "\t" + str(distance) + "\t" + str(dhs_pctg) +
                        "\t" + str(area_pctg) + "\t" + "\t".join(metainfo)[:-1] + "\n")
                else:
                    # Choose the best candidate
                    # {gene1: [[TSS, Mygenes], [GENE_BODY, Mygenes]], gene2: [TSS, Mygenes]}

                    for flag in rules:
                        found = False

                        transcript_id = None
                        n_transcripts = 0
                        for i in range(len(myobject)):
                            myexon = myobject[i][1]
                            myflag = myobject[i][0]

                            if myflag == flag:
                                found = True
                                n_transcripts = n_transcripts - 1

                                if transcript_id is None:
                                    transcript_id = myexon.getTranscript()
                                else:
                                    transcript_id = transcript_id + "_" + myexon.getTranscript()
                        if found is True:
                            # Report the current gene
                            if n_transcripts == -1:
                                # When only one transcript could be selected due to the rules, we will return the
                                # distance based on its flag
                                myexon     = toreport[transcript_id][0]
                                distance   = toreport[transcript_id][2]
                                dhs_pctg   = toreport[transcript_id][3]
                                area_pctg  = toreport[transcript_id][4]

                                outobj.write(dhs_id + "\t" + str(pm) + "\t" + myexon.getGene() + "\t" + transcript_id + "\t" +
                                    str(n_transcripts) + "\t" + flag + "\t" + str(distance) + "\t" + str(dhs_pctg) +
                                    "\t" + str(area_pctg) + "\t" + "\t".join(metainfo)[:-1] + "\n")
                            else:
                                # There's a tie between transcripts, so don't really know which distance and %s return -> -1

                                outobj.write(dhs_id + "\t" + str(pm) + "\t" + gene_id + "\t" + transcript_id + "\t-1\t" + flag + "\t-1\t-1\t-1\t" + "\t".join(metainfo)[:-1] + "\n")
                            break


def run(gtf, dhs, outputfile, options):
    ########################
    ## CODE ADDED BY RAFA ##
    # Global variables
    global rules
    global perc_area
    global perc_region
    global tss
    global promotor
    global distance
    global level
    global gene_id_tag
    global tran_id_tag

    presortedGTF = options.get("presortedGTF", False)
    rules       = options.get("rules", rules)
    perc_area   = options.get("perc_area", perc_area)
    perc_region = options.get("perc_region", perc_region)
    tss         = options.get("tss", tss)
    promotor    = options.get("promotor", promotor)
    distance    = options.get("distance", distance)
    level       = options.get("level", level)
    gene_id_tag = options.get("gene_id_tag", gene_id_tag)
    tran_id_tag = options.get("tran_id_tag", tran_id_tag)
    ## END CODE ADDED BY RAFA ##
    ############################

    # 1. First, we save all the genes with their positions
    inputGTF = None
    if gtf[-2:] == "gz":
        aux = gzip.open(gtf, 'rU').read().decode()
        inputGTF = aux.split("\n")
    else:
        inputGTF = open(gtf, 'rU')
    genes = {}
    allTranscripts = {}

    for line in inputGTF:

        # Avoid comments
        if line and line[0] != "#":
            linea_split = line.split("\t")
            chrom = linea_split[0]
            start = int(linea_split[3])
            end   = int(linea_split[4])
            strand = linea_split[6]

            popurri = linea_split[8]

            if linea_split[2] == "exon":

                gene_id       = popurri.split(gene_id_tag)[1].split('";')[0].split('"')[1]
                transcript_id = popurri.split(tran_id_tag)[1].split('";')[0].split('"')[1]
                
                exon_number = popurri.split('exon_number ')[1].split(';')[0].split('"')[1]
                # We save the information read
                if chrom not in genes:
                    genes[chrom] = []
                mygen = Mygenes(gene_id, start, end, strand, transcript_id, exon_number)
                genes[chrom].append(mygen)
                
                if transcript_id not in allTranscripts:
                    allTranscripts[transcript_id] = Mytranscripts()
                allTranscripts[transcript_id].addGene(mygen)

    if gtf[-2:] == "gz":
        inputGTF = None
    else:
        inputGTF.close()

    # Check exon number in transcripts
    for transcript in allTranscripts:
        allTranscripts[transcript].checkExonNumbers()

    inputDHS = open(dhs, 'r')
    myregions = {}

    for dhs_line in inputDHS:

        if dhs_line[0] != "#":
            line = dhs_line.split("\t")
            chrom = line[0]
            start = int(line[1])
            end = int(line[2])

            metainfo = line[3:]

            if chrom not in myregions:
                myregions[chrom] = []

            myregions[chrom].append([start,end, metainfo])
        else:
            myheader = dhs_line.split("\t")[3:]

    inputDHS.close()

    salida = open(outputfile,'w')
    salida.write("#Region\tMidpoint\tGene\tTranscript\tExon\tArea\tDistance\tPercRegion\tPercArea\t" + "\t".join(myheader)[:-1] + "\n")

    last_index = None
    old_chrom = ""
    gene_vector = None

    for chrom in myregions:

        last_index = 0
        gene_vector = sorted(genes[chrom], key = lambda tup:tup.getStart())

        # Sort gene exons
        #################
        # Get all start points in the exons
        # all_starts_genes = [0] * len(gene_vector)
        # for i in range(len(gene_vector)):
        #     all_starts_genes[i] = gene_vector[i].getStart()

        # # Sort all the start points 
        # all_starts_genes_sorted = sorted(all_starts_genes)

        # Sort regions
        ###############
        # Get all start points in the regions
        all_regions = sorted(myregions[chrom], key= lambda tup:tup[0])
        # all_starts = [0] * len(myregions[chrom])
        # for i in range(len(myregions[chrom])):
        #     all_starts[i] = myregions[chrom][i][0]

        # # Sort all start points
        # all_starts_sorted = sorted(all_starts)

        #for start in all_starts_sorted:
        for one_region in all_regions:
            start = one_region[0]
            end = one_region[1]
            metainfo = one_region[2]
            #index = all_starts.index(start)
            #end = myregions[chrom][index][1]
            pm = (end+start)/2
            dhs_id = chrom + "_" + str(start) + "_" + str(end)

            # Remove current region from all_starts and myregions[chrom]
            # all_starts.pop(index)
            # myregions[chrom].pop(index)

            # Start analysis
            down = 0 # Distance to TTS
            exon_down = ""
            flag_down = False # When you cannot find a better candidate for downstream, it is set to True
            last_index_down = last_index

            upst = 0 # Distance to TSS
            exon_up = ""
            flag_up = False # When you cannot find a better candidate for upstream, it is set to True
            last_index_up = last_index

            # When flagGeneBody is False, we will report downstream or upstream exons
            # Otherwise, we will only report the overlapped exons
            flagGeneBody = False

            # Array containing the relations that are going to be reported
            # [ [Mygenes1, [type, dist, %DHS, %feature], [type, dist, %DHS, %feature]...], [Mygenes2, [type, dist, %DHS, %feature], [type, dist, %DHS, %feature]...] ... ]
            myfinaloutput = []

            for i in range(last_index, len(gene_vector)):

                mycurrentExon = []
                exon = gene_vector[i]

                #
                #     <--------->
                #                    |--------------|
                #
                # Exon before DHS region
                if exon.getEnd() < start:

                    dist_tmp = pm - exon.getEnd()

                    if exon.getStrand() == "+":
                        if down == 0 or dist_tmp < down:
                            down = dist_tmp
                            exon_down = exon
                            last_index_down = i

                    else:
                        if upst == 0 or dist_tmp < upst:
                            upst = dist_tmp
                            exon_up = exon
                            last_index_up = i

                    # We update the point from we will keep on looking at exons for new DHS regions
                    last_index = last_index_down if last_index_down < last_index_up else last_index_up




                #
                #                     <--------->
                #   |--------------|
                #
                # Exon after DHS region
                elif exon.getStart() > end:

                    # If we already reported an exon overlapping with the DHS region, break the loop
                    if flagGeneBody is True:
                        # Report the object
                        reportOutput(myfinaloutput, dhs_id, start, end, salida, metainfo)
                        break

                    dist_tmp = exon.getStart() - pm

                    if exon.getStrand() == "+":
                        if upst == 0 or dist_tmp < upst:
                            upst = dist_tmp
                            exon_up = exon

                        # Check if we could find a better candidate
                        if dist_tmp >= upst:
                            flag_up = True

                    else:
                        if down == 0 or dist_tmp < down:
                            down = dist_tmp
                            exon_down = exon

                        # Check if we could find a better candidate
                        if dist_tmp >= down:
                            flag_down = True




                #
                # Exon somewhere overlapping DHS region
                #
                else:

                    if len(mycurrentExon) == 0:
                        mycurrentExon.append(exon)

                    dhs_length = end - start + 1
                    exon_length = exon.getEnd() - exon.getStart() + 1
                    # Comprobamos overlapping en TSS
                    if exon.getStrand() == "+" and start <= exon.getStart() <= end:
                        #
                        #          |--------------->   Gene
                        #    |----------               DHS
                        #

                        # Report upstream part
                        if exon.getExon() == "1":
                            # TSS region, so will check all possibilities...
                            mycurrentExon = mycurrentExon + checkTSS(start, end, exon, 0)
                        else:
                            pctg_dhs_intron_up = ((exon.getStart() - start) / float(dhs_length)) * 100
                            tag = "INTRON" # INTRON_UP
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_intron_up) + "\t-1\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_intron_up, -1])

                        #
                        #          |--------------->   Gene
                        #    |----------|              DHS
                        #

                        if exon.getEnd() > end:
                            # Report body part
                            pctg_dhs_body = ((end - exon.getStart() + 1) / float(dhs_length)) * 100
                            pctg_exon_body = ((end - exon.getStart() + 1) / float(exon_length)) * 100
                            tag = "1st_EXON" if exon.getExon() == "1" else "GENE_BODY"
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_body) + "\t" + str(pctg_exon_body) + "\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_body, pctg_exon_body])

                        #
                        #          |--------------->                    Gene
                        #    |---------------------------|              DHS
                        #
                        else:
                            # Report body part
                            pctg_dhs_body = (exon_length / float(dhs_length)) * 100
                            pctg_exon_body = 100
                            tag = "1st_EXON" if exon.getExon() == "1" else "GENE_BODY"
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_body) + "\t" + str(pctg_exon_body) + "\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_body, pctg_exon_body])

                            # Report downstream part
                            pctg_dhs_down = ((end - exon.getEnd()) / float(dhs_length)) * 100
                            tag = "INTRON" #INTRON_DOWN
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_down) + "\t-1\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_down, -1])

                    elif exon.getStrand() == "+" and exon.getStart() <= start <= exon.getEnd():
                        #
                        #    |-------------------->   Gene
                        #        |----------          DHS
                        #

                        #
                        #    |-------------------->   Gene
                        #        |----------|         DHS
                        #
                        if exon.getEnd() > end:
                            # Report body part
                            pctg_dhs_body = 100
                            pctg_exon_body = (dhs_length / float(exon_length)) * 100
                            tag = "1st_EXON" if exon.getExon() == "1" else "GENE_BODY"
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_body) + "\t" + str(pctg_exon_body) + "\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_body, pctg_exon_body])

                        #
                        #    |-------------------->               Gene
                        #        |----------------------|         DHS
                        #
                        else:
                            # Report body part
                            pctg_dhs_body = ((exon.getEnd() - start + 1) / float(dhs_length)) * 100
                            pctg_exon_body = ((exon.getEnd() - start + 1) / float(exon_length)) * 100
                            tag = "1st_EXON" if exon.getExon() == "1" else "GENE_BODY"
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_body) + "\t" + str(pctg_exon_body) + "\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_body, pctg_exon_body])

                            # Report downstream part
                            pctg_dhs_down = ((end - exon.getEnd()) / float(dhs_length)) * 100
                            tag = "INTRON" #INTRON_DOWN
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_down) + "\t-1\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_down, -1])



                    elif exon.getStrand() == "-" and start <= exon.getEnd() <= end:
                        #
                        #    <---------------|            Gene
                        #              -----------|       DHS
                        #

                        # Report upstream part
                        if exon.getExon() == "1":
                            # TSS region, so will check all possibilities...
                            mycurrentExon = mycurrentExon + checkTSS(start, end, exon, 0)
                        else:
                            pctg_dhs_intron_up = ((end - exon.getEnd()) / float(dhs_length)) * 100
                            tag = "INTRON" # INTRON_UP
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_intron_up) + "\t-1\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_intron_up, -1])

                        #
                        #    <---------------|            Gene
                        #             |-----------|       DHS
                        #
                        if exon.getStart() <= start:
                            # Report body part
                            pctg_dhs_body = ((exon.getEnd() - start + 1) / float(dhs_length)) * 100
                            pctg_exon_body = ((exon.getEnd() - start + 1) / float(exon_length)) * 100
                            tag = "1st_EXON" if exon.getExon() == "1" else "GENE_BODY"
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_body) + "\t" + str(pctg_exon_body) + "\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_body, pctg_exon_body])

                        #
                        #      <---------------|            Gene
                        #  |----------------------|         DHS
                        #
                        else:
                            # Report body part
                            pctg_dhs_body = (exon_length / float(dhs_length)) * 100
                            pctg_exon_body = 100
                            tag = "1st_EXON" if exon.getExon() == "1" else "GENE_BODY"
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_body) + "\t" + str(pctg_exon_body) + "\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_body, pctg_exon_body])

                            # Report downstream part
                            pctg_dhs_down = ((exon.getStart() - start) / float(dhs_length)) * 100
                            tag = "INTRON" # INTRON_DOWN
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_down) + "\t-1\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_down, -1])

                    elif exon.getStrand() == "-" and exon.getStart() <= end <= exon.getEnd():
                        #
                        #    <---------------|            Gene
                        #        --------|                DHS
                        #

                        #
                        #    <---------------|            Gene
                        #        |--------|               DHS
                        #
                        if exon.getStart() <= start:
                            # Report body part
                            pctg_dhs_body = 100
                            pctg_exon_body = (dhs_length / float(exon_length)) * 100
                            tag = "1st_EXON" if exon.getExon() == "1" else "GENE_BODY"
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_body) + "\t" + str(pctg_exon_body) + "\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_body, pctg_exon_body])

                        #
                        #        <---------------|            Gene
                        #   |--------------|                  DHS
                        #
                        else:
                            # Report body part
                            pctg_dhs_body = ((end - exon.getStart() + 1) / float(dhs_length)) * 100
                            pctg_exon_body = ((end - exon.getStart() + 1) / float(exon_length)) * 100
                            tag = "1st_EXON" if exon.getExon() == "1" else "GENE_BODY"
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_body) + "\t" + str(pctg_exon_body) + "\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_body, pctg_exon_body])

                            # Report downstream part
                            pctg_dhs_down = ((exon.getStart() - start) / float(dhs_length)) * 100
                            tag = "INTRON" #INTRON_DOWN
                            # salida.write(dhs_id + "\t" + str(pm) + "\t" + exon.getGene() + "\t" + exon.getTranscript() + "\t" + exon.getExon() + "\t" + tag + "\t0\t" + str(pctg_dhs_down) + "\t-1\n")
                            mycurrentExon.append([tag, 0, pctg_dhs_down, -1])

                    flagGeneBody = True
                    # Add current exon to final output object
                    myfinaloutput.append(mycurrentExon)

                # When we cannot find better candidates, break the loop after returning the results
                if (flag_down is True and flag_up is True) or i == (len(gene_vector) - 1):

                    # DOWNSTREAM
                    if (upst == 0 and down != 0) or down < upst:
                        n_exones_down = allTranscripts[exon_down.getTranscript()].getExons()

                        if (int(exon_down.getExon()) == n_exones_down) and (0 < down <= distance):
                            salida.write(dhs_id + "\t" + str(pm) + "\t" + exon_down.getGene() + "\t" + exon_down.getTranscript() + "\t" + exon_down.getExon() + "\tDOWNSTREAM\t" + str(down) + "\t100\t-1\t" + "\t".join(metainfo)[:-1] + "\n")
                        elif (int(exon_down.getExon()) != n_exones_down):
                            salida.write(dhs_id + "\t" + str(pm) + "\t" + exon_down.getGene() + "\t" + exon_down.getTranscript() + "\t" + exon_down.getExon() + "\tINTRON\t0\t100\t-1\t" + "\t".join(metainfo)[:-1] + "\n")

                    # UPSTREAM
                    elif (upst != 0 and down == 0) or upst < down:

                        # When it's the first exon, we have to check the distance to determine the proper tag
                        if (exon_up.getExon() == "1") and (0 < upst <= distance):
                            # Check all TSS possibilities...
                            myfinaloutput = [[exon_up] + checkTSS(start, end, exon_up, upst)]
                            reportOutput(myfinaloutput, dhs_id, start, end, salida, metainfo)
                        elif (exon_up.getExon() != "1"):
                            salida.write(dhs_id + "\t" + str(pm) + "\t" + exon_up.getGene() + "\t" + exon_up.getTranscript()  + "\t" + exon_up.getExon()  + "\tINTRON\t0\t100\t-1\t" + "\t".join(metainfo)[:-1] + "\n")

                    # The same distance upstream and downstream
                    else:

                        # DOWNSTREAM
                        n_exones_down = allTranscripts[exon_down.getTranscript()].getExons()

                        if level == "transcript" and exon_down.getTranscript() == exon_up.getTranscript() or level == "gene" and exon_down.getGene() == exon_up.getGene():
                            # Rules must be applied

                            myfinaloutput = []
                            # DOWNSTREAM
                            if (int(exon_down.getExon()) == n_exones_down) and (0 < down <= distance):
                                myfinaloutput.append([exon_down] + [["DOWNSTREAM",down,100,-1]])
                            elif (int(exon_down.getExon()) != n_exones_down):
                                myfinaloutput.append([exon_down] + [["INTRON",0,100,-1]])

                            # UPSTREAM
                            if (exon_up.getExon() == "1") and (0 < upst <= distance):
                                # Check all TSS possibilities...
                                myfinaloutput.append([exon_up] + checkTSS(start, end, exon_up, upst))
                            elif (exon_up.getExon() != "1"):
                                myfinaloutput.append([exon_up] + [["INTRON",0,100,-1]])

                            # Apply the rules to select the report
                            reportOutput(myfinaloutput, dhs_id, start, end, salida, metainfo)


                        else:
                            # We will report both upstream and downstream

                            if (int(exon_down.getExon()) == n_exones_down) and (0 < down <= distance):
                                salida.write(dhs_id + "\t" + str(pm) + "\t" + exon_down.getGene() + "\t" + exon_down.getTranscript() + "\t" + exon_down.getExon() + "\tDOWNSTREAM\t" + str(down) + "\t100\t-1\t" + "\t".join(metainfo)[:-1] + "\n")
                            elif (int(exon_down.getExon()) != n_exones_down):
                                salida.write(dhs_id + "\t" + str(pm) + "\t" + exon_down.getGene() + "\t" + exon_down.getTranscript() + "\t" + exon_down.getExon() + "\tINTRON\t0\t100\t-1\t" + "\t".join(metainfo)[:-1] + "\n")

                            #UPSTREAM
                            # When it's the first exon, we have to check the distance to determine the proper tag
                            if (exon_up.getExon() == "1") and (0 < upst <= distance):
                                # Check all TSS possibilities...
                                myfinaloutput = [[exon_up] + checkTSS(start, end, exon_up, upst)]
                                reportOutput(myfinaloutput, dhs_id, start, end, salida, metainfo)
                            elif (exon_up.getExon() != "1"):
                                salida.write(dhs_id + "\t" + str(pm) + "\t" + exon_up.getGene() + "\t" + exon_up.getTranscript()  + "\t" + exon_up.getExon()  + "\tINTRON\t0\t100\t-1\t" + "\t".join(metainfo)[:-1] + "\n")

                    break


    inputDHS.close()
    salida.close()

    keys = allTranscripts.keys()
    for i in keys:
        del allTranscripts[i]

    import gc
    gc.collect()
    gc.enable()


if __name__ == "__main__":
    main()
