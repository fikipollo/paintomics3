#!/usr/bin/python
# -*- coding: utf-8 -*-
# Author: Pedro Furió Tarí

import getopt
import sys
import os.path
import gzip
import re

# Global variables
rules          = ["TSS","1st_EXON","PROMOTER","TTS","INTRON","GENE_BODY","UPSTREAM","DOWNSTREAM"]
perc_area      = 90
perc_region    = 50
tss            = 200.0
tts            = 0.0
promotor       = 1300.0
distance       = 10000
level          = "exon"
gene_id_tag    = "gene_id"
tran_id_tag    = "transcript_id"
gene_id_re     = re.compile(r"gene_id \"?(.*?)\"?;")
tran_id_re     = re.compile(r"transcript_id \"?(.*?)\"?;")
ignore_missing = False
match_table    = None
check_strand   = False

class Candidate:
    def __init__(self, start, end, strand, exon_number, area, transcript, gene, distance, pctg_region, pctg_area, tssdist, ttsdist):
        self.start       = start
        self.end         = end
        self.strand      = strand
        self.exon_number = exon_number
        self.area        = area
        self.transcript  = transcript
        self.gene        = gene
        self.distance    = distance
        self.parea       = pctg_area
        self.pregion     = pctg_region
        self.tssdist     = tssdist
        self.ttsdist     = ttsdist

    def getStart(self):
        return self.start

    def getEnd (self):
        return self.end

    def getStrand(self):
        return self.strand

    def getExonNr(self):
        return self.exon_number

    def getArea(self):
        return self.area

    def getTranscript(self):
        return self.transcript

    def getGene(self):
        return self.gene

    def getDistance(self):
        return self.distance

    def getPRegion(self):
        return self.pregion

    def getPArea(self):
        return self.parea
        
    def getTSSdistance(self):
        return self.tssdist

    def getTTSdistance(self):
        return self.ttsdist


# Objects to store the annotations from the GTF file
class Myexons:
    def __init__(self, start, end, exon):
        self.start = start
        self.end = end
        self.exon = exon

    def getStart(self):
        return self.start

    def getEnd(self):
        return self.end

    def getExon(self):
        return self.exon

    def setExon(self, exon_number):
        self.exon = exon_number


class Mytranscripts:
    def __init__(self, trans_id):
        self.myexons = []
        self.trans_id = trans_id
        self.start = sys.maxsize
        self.end = 0

    def addExon(self, myexon):
        self.myexons.append(myexon)

    def getTranscriptID(self):
        return self.trans_id

    def getExons(self):
        return self.myexons

    def size(self):
        return len (self.myexons)

    # Just to rename exon numbers on the negative strand because some GTFs have it wrong tagged
    def checkExonNumbers(self, strand):

        # Sort them by position        
        self.myexons = sorted(self.myexons, key=lambda tup:tup.getStart())

        # For positive strands assign an increasing order
        if strand == "+":
            n_exons = 1
        
            for exon in self.myexons:
                exon.setExon(str(n_exons))
                n_exons = n_exons + 1
        # For negative strands use an inverse order
        else:
            n_exons = len(self.myexons)
            
            for exon in self.myexons:
                exon.setExon(str(n_exons))
                n_exons = n_exons - 1

    def calculateSize(self):
        # When we don't have the transcript tag, we calculate the sizes
        for exon in self.myexons:
            if exon.getStart() < self.start:
                self.start = exon.getStart()
            if exon.getEnd() > self.end:
                self.end = exon.getEnd()
                          
    def setLength(self, start, end):
        # If we read the transcript tag, we set the sizes
        self.start = start
        self.end   = end

    def getStart(self):
        return self.start

    def getEnd (self):
        return self.end


class Mygenes:
    def __init__(self, gene_id, strand):
        self.mytranscripts = []
        self.start = sys.maxsize
        self.end = 0
        self.gene_id = gene_id
        self.strand = strand

    def getGeneID(self):
        return self.gene_id

    def addTranscript(self, mytranscript):
        self.mytranscripts.append(mytranscript)

    def getTranscripts(self):
        return self.mytranscripts

    def size(self):
        return len(self.mytranscripts)

    def calculateSize(self):
        # When we don't have the transcript tag, we calculate the sizes
        for transcript in self.mytranscripts:
            if transcript.getStart() < self.start:
                self.start = transcript.getStart()
            if transcript.getEnd() > self.end:
                self.end = transcript.getEnd()
                          
    def setLength(self, start, end):
        # If we read the transcript tag, we set the sizes
        self.start = start
        self.end   = end

    def getStart(self):
        return self.start

    def getEnd (self):
        return self.end

    def getStrand(self):
        return self.strand


def main():
    try:
        opts, args = getopt.getopt(sys.argv[1:], "hg:b:o:q:r:t:p:R:v:w:G:T:s:m:ic", ["help", "gtf=", "bed=", "output=", "distance=", "report=", "tss=", "promoter=", "rules=", "perc_area=", "perc_region=", "gene=","transcript=", "tts=", "match_table=", "ignore_missing", "check_strand"])
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
    global tts
    global promotor
    global distance
    global level
    global gene_id_tag
    global tran_id_tag
    global gene_id_re
    global tran_id_re
    global ignore_missing
    global match_table
    global check_strand

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
            gene_id_re  = re.compile(r"{0} \"?(.*?)\"?;".format(a))
        elif o in ("-T", "--transcript"):
            tran_id_tag = a
            tran_id_re  = re.compile(r"{0} \"?(.*?)\"?;".format(a))
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
            if tss < 0:
                sys.stderr.write("\nERROR: The TSS distance cannot be lower than 0 bps.\n")
        elif o in ("-s", "--tts"):
            tts = int(a)
            if tts < 0:
                sys.stderr.write("\nERROR: The TTS distance cannot be lower than 0 bps.\n")
        elif o in ("-p", "--promoter"):
            promotor = int(a)
            if promotor < 0:
                sys.stderr.write("\nERROR: The promoter distance cannot be lower than 0 bps.\n")
        elif o in ("-R", "--rules"):
            if readRules(a) is False:
                sys.stderr.write("\nERROR: Rules not properly passed.\n")
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
        elif o in ("-m", "--match_table"):
            if os.path.isfile(a):
                match_table = a
            else:
                sys.stderr.write("\nERROR: Match table file not recognized.\n")
                usage()
                sys.exit()
        elif o in ("-i", "--ignore_missing"):
            ignore_missing = True
        elif o in ("-c", "--check_strand"):
            check_strand = True
        else:
            assert False, "Unhandled option"

    if gtf is not None and dhs is not None and outputfile is not None:
        run(gtf, dhs, outputfile, match_table)
    else:
        usage()


def usage():
    print("\nUsage: python rgmatch.py [options] <mandatory>")
    print("Options:")
    print("\t-r, --report:\n\t\t Report at the 'exon', 'transcript' or 'gene' level. Default: 'exon'")
    print("\t-q, --distance:\n\t\t Maximum distance in kb to report associations. Default: 10 (10kb)")
    print("\t-t, --tss:\n\t\t TSS region distance. Default: 200 bps")
    print("\t-s, --tts:\n\t\t TTS region distance. Default: 0 bps")
    print("\t-p, --promoter:\n\t\t Promoter region distance. Default: 1300 bps")
    print("\t-v, --perc_area:\n\t\t Percentage of the area of the gene overlapped to be considered to discriminate at transcript and gene level. Default: 90 (90%)")
    print("\t-w, --perc_region:\n\t\t Percentage of the region overlapped by the gene to be considered to discriminate at transcript and gene level. Default: 50 (50%)")
    print("\t-R, --rules:\n\t\t Priorities in case of ties. Default: TSS,1st_EXON,PROMOTER,TTS,INTRON,GENE_BODY,UPSTREAM,DOWNSTREAM")
    print("\t-G, --gene:\n\t\t GTF tag used to get gene ids/names. Default: gene_id")
    print("\t-T, --transcript:\n\t\t GTF tag used to get transcript ids/names. Default: transcript_id")
    print("\t-h, --help:\n\t\t show this help message and exit")
    print("\t-i, --ignore_missing:\n\t\t Silently ignore BED missing regions not present in GTF file")
    print("\t-m, --match_table:\n\t\t Match table (2 tab separated columns: GTF -> BED) to transform GTF chromosome/scaffolds IDS to the ones used in the BED file")
    print("\t-c, --check_strand:\n\t\t Consider strand specificity when determining the association")
    print("Mandatory:")
    print("\t-g, --gtf:\n\t\t GTF annotation file")
    print("\t-b, --bed:\n\t\t Region bed file")
    print("\t-o, --output:\n\t\t Output file")
    print("\n25/04/2017. Pedro Furio-Tari. Carlos Martinez.\n")


def readRules(myrules):

    global rules
    rules = []

    myrules_spl = myrules.split(",")

    for tag in myrules_spl:
        if tag in ["TSS","1st_EXON","PROMOTER","TTS","INTRON","GENE_BODY","UPSTREAM","DOWNSTREAM"] and tag not in rules:
            rules.append(tag)

    # Check that we have stored all the possible tags in the proper order
    if len(rules) == 8:
        return True
    else:
        return False


def checkTSS(start, end, exon):

    exon_start = exon.getStart()
    distance = exon.getDistance()
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
            salida.append([tag, pctg_dhs_200, pctg_tss_200])
    
        else:
            # UPSTREAM       PROMOTER        TSS          1st exon
            # ..........|................|..............|----------->
            #                      DHS
            #                        --------------

            pctg_dhs_200 = ((min (exon_start-1, dhs_end) - (exon_start - tss) + 1)/float(dhs_length))*100
            pctg_tss_200 = ((min (exon_start-1, dhs_end) - (exon_start - tss) + 1)/float(tss))*100
            tag = "TSS"
            # Report TSS
            salida.append([tag, pctg_dhs_200, pctg_tss_200])

            if exon_start - dhs_start <= (tss + promotor):
                # UPSTREAM       PROMOTER        TSS           1st exon
                # ..........|................|..............|----------->
                #                      DHS
                #                     |--------------|

                pctg_dhs_1500 = ((exon_start - tss - dhs_start ) / float(dhs_length))*100
                pctg_tss_1500 = ((exon_start - tss - dhs_start ) / float(promotor))*100
                tag = "PROMOTER"
                # Report PROMOTER
                salida.append([tag, pctg_dhs_1500, pctg_tss_1500])

            else:
                # UPSTREAM       PROMOTER        TSS          1st exon
                # ..........|................|..............|----------->
                #                      DHS
                #       |---------------------------|
                pctg_dhs_1500 = (promotor / float(dhs_length))*100
                pctg_tss_1500 = 100
                tag = "PROMOTER"
                # Report PROMOTER
                salida.append([tag, pctg_dhs_1500, pctg_tss_1500])

                pctg_dhs_upst = ((exon_start - tss - promotor - dhs_start) / float(dhs_length))*100
                pctg_tss_upst = -1
                tag = "UPSTREAM"
                # Report UPSTREAM
                salida.append([tag, pctg_dhs_upst, pctg_tss_upst])

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
            salida.append([tag, pctg_dhs_1500, pctg_tss_1500])
            
        else:
            # UPSTREAM       PROMOTER        TSS          1st exon
            # ..........|................|..............|----------->
            #                   DHS
            #       |-------------|
            pctg_dhs_1500 = ((dhs_end - (exon_start - tss - promotor) + 1)/float(dhs_length))*100
            pctg_tss_1500 = ((dhs_end - (exon_start - tss - promotor) + 1)/float(promotor))*100
            tag = "PROMOTER"
            # Report PROMOTER
            salida.append([tag, pctg_dhs_1500, pctg_tss_1500])

            pctg_dhs_upst = ((exon_start - tss - promotor - dhs_start) / float(dhs_length))*100
            pctg_tss_upst = -1
            tag = "UPSTREAM"
            # Report UPSTREAM
            salida.append([tag, pctg_dhs_upst, pctg_tss_upst])
            
    else:
        pctg_dhs_upst = 100
        pctg_tss_upst = -1
        tag = "UPSTREAM"
        # Report UPSTREAM
        salida.append([tag, pctg_dhs_upst, pctg_tss_upst])
        
    return salida


def checkTTS(start, end, exon):

    exon_start = exon.getStart()
    distance = exon.getDistance()
    dhs_start = start
    dhs_end = end

    pm = (start + end)/2

    # If exon is in the positive strand, we will change the sign in order to make this code invariant to the strand
    if exon.getStrand() == "+":
        aux = dhs_end
        dhs_end = 2 * exon.getEnd() - dhs_start
        dhs_start = 2 * exon.getEnd() - aux
        exon_start = exon.getEnd()

    dhs_length = dhs_end - dhs_start + 1

    salida = []

    if distance <= tts:

        # DOWNSTREAM       TTS        last exon
        # ..........|...............|----------->

        if exon_start - dhs_start <= tts:
            # DOWNSTREAM        TSS          last exon
            # ..........|................|----------->
            #                      DHS
            #                  |-------------


            pctg_dhs_200 = ((min (exon_start-1, dhs_end) - dhs_start + 1)/float(dhs_length))*100
            pctg_tts_200 = ((min (exon_start-1, dhs_end) - dhs_start + 1)/float(tts))*100
            tag = "TTS"
            # Report TTS
            salida.append([tag, pctg_dhs_200, pctg_tts_200])
    
        else:
            # DOWNSTREAM         TSS          last exon
            # ............|..............|----------->
            #               DHS
            #       --------------

            pctg_dhs_200 = ((min (exon_start-1, dhs_end) - (exon_start - tts) + 1)/float(dhs_length))*100
            pctg_tts_200 = ((min (exon_start-1, dhs_end) - (exon_start - tts) + 1)/float(tts))*100
            tag = "TTS"
            # Report TTS
            salida.append([tag, pctg_dhs_200, pctg_tts_200])

            pctg_dhs_down = ((exon_start - tts - dhs_start) / float(dhs_length))*100
            pctg_tts_down = -1
            tag = "DOWNSTREAM"
            # Report DOWNSTREAM
            salida.append([tag, pctg_dhs_down, pctg_tts_down])

    else:
        pctg_dhs_down = 100
        pctg_tts_down = -1
        tag = "DOWNSTREAM"
        salida.append([tag, pctg_dhs_down, pctg_tts_down])
        
    return salida


# myfinaloutput: Vector of "Candidate"'s
# groupedBy: { transcript1: [pos1, pos3], transcript2: [pos2]};
# Returns the vector of "Candidate"'s to be reported after applying the rules
def applyRules(myfinaloutput, groupedBy):

    toreport = []

    for my_id in groupedBy:
        if len(groupedBy[my_id]) == 1:
            toreport.append(myfinaloutput[groupedBy[my_id][0]])
        else:
            positions = groupedBy[my_id]
            tmpResultsRegion = []

            # Check %Region
            for pos in positions:
                myexon = myfinaloutput[pos]
                if myexon.getPRegion() >= perc_region:
                    tmpResultsRegion.append(myexon)

            if len(tmpResultsRegion) == 1:
                toreport.append(tmpResultsRegion[0])
            elif len(tmpResultsRegion) == 0:
                # Fill with all the results
                for pos in positions:
                    tmpResultsRegion.append(myfinaloutput[pos])

            if len(tmpResultsRegion) > 1:
                tmpResults = []

                # Check %Area
                for myexon in tmpResultsRegion:
                    #myexon = tmpResultsRegion[pos]
                    if myexon.getPArea() >= perc_area:
                        tmpResults.append(myexon)

                if len(tmpResults) == 1:
                    toreport.append(tmpResults[0])
                elif len(tmpResults) == 0:
                    # Fill the vector again with all the candidates
                    for myexon in tmpResultsRegion:
                        tmpResults.append(myexon)

                if len(tmpResults) > 1:

                    maximum_pctg = 0
                    region_candidates = []
                    # Check if there's an exon with maximum %Region
                    for myexon in tmpResults:

                        if myexon.getPRegion() > maximum_pctg:
                            maximum_pctg = myexon.getPRegion()
                            region_candidates = [myexon]
                        elif myexon.getPRegion() == maximum_pctg:
                            region_candidates.append(myexon)

                    if len(region_candidates) == 1:
                        toreport.append(region_candidates[0])
                    else:
                        # Apply the rules amongst the best candidates
                        flagRule = False
                        for area_rule in rules:
                            for myexon in region_candidates:
                                if myexon.getArea() == area_rule:
                                    toreport.append(myexon)
                                    flagRule = True
                            if flagRule is True:
                                break
    return toreport


# myfinaloutput: Vector of "Candidate"'s
# groupedBy: { gene1: [pos1, pos3], gene2: [pos2]}
# Returns the vector of "Candidate"'s to be reported after applying the rules
def selectTranscript(myfinaloutput, groupedBy):

    toreport = []
    for my_id in groupedBy:

        if len(groupedBy[my_id]) == 1:
            toreport.append(myfinaloutput[groupedBy[my_id][0]])
        else:
            myAreas = {}
            positions = groupedBy[my_id]

            for pos in positions:
                myexon = myfinaloutput[pos]
                if myexon.getArea() in myAreas:
                    myAreas[myexon.getArea()].append(pos)
                else:
                    myAreas[myexon.getArea()] = [pos]

            # Apply the set of rules
            area_winner = None
            for area_rule in rules:
                if area_rule in myAreas.keys():
                    area_winner = area_rule
                    break

            if len(myAreas[area_winner]) == 1:
                toreport.append( myfinaloutput[myAreas[area_winner][0]] )
            else:
                # Report all the candidates that have a tie
                transcripts = ""
                exons       = ""
                pArea       = 0
                pRegion     = 0

                for pos in myAreas[area_winner]:
                    mycandidate = myfinaloutput[pos]
                    transcripts = transcripts + mycandidate.getTranscript() + ","
                    exons       = exons       + mycandidate.getExonNr()     + ","
                    pArea   = max(pArea, mycandidate.getPArea())
                    pRegion = max(pRegion, mycandidate.getPRegion())

                mycandidate_ref = myfinaloutput[myAreas[area_winner][0]]
                mycandidate = Candidate(mycandidate_ref.getStart(), mycandidate_ref.getEnd(), mycandidate_ref.getStrand(), exons[:-1], 
                    mycandidate_ref.getArea(), transcripts[:-1], mycandidate_ref.getGene(), mycandidate_ref.getDistance(), 
                    pRegion, pArea, mycandidate_ref.getTSSdistance())
                toreport.append(mycandidate)

    return toreport


def reportOutput(myfinaloutput, dhs_id, start, end, outobj, metainfo):

    pm = (start + end)/2
    
    if level == "exon":
        # Report everything
        for myexon in myfinaloutput:
            outobj.write(dhs_id + "\t" + str(pm) + "\t" + myexon.getGene() + "\t" + myexon.getTranscript() + "\t" +
                    myexon.getExonNr() + "\t" + myexon.getArea() + "\t" + str(myexon.getDistance()) + "\t" + str(myexon.getTSSdistance()) + "\t" + str(myexon.getTTSdistance()) + "\t" + str("{0:.2f}".format(myexon.getPRegion())) +
                    "\t" + str("{0:.2f}".format(myexon.getPArea())) + (("\t" + "\t".join(metainfo)[:-1]) if len(metainfo) > 0 else "") + "\n")
    else:
        # Dictionary with positions where we can find a transcript in myfinaloutput
        # Example: { transcript1: [pos1, pos3], transcript2: [pos2]}
        mytranscripts = {}
        for pos in range(len(myfinaloutput)):
            transcript_id = myfinaloutput[pos].getTranscript()
            if transcript_id not in mytranscripts:
                mytranscripts[transcript_id] = [pos]
            else:
                mytranscripts[transcript_id].append(pos)

        toreport = applyRules(myfinaloutput, mytranscripts)


        if level == "transcript":
            # Report the vector toreport
            for myexon in toreport:
                outobj.write(dhs_id + "\t" + str(pm) + "\t" + myexon.getGene() + "\t" + myexon.getTranscript() + "\t" +
                    myexon.getExonNr() + "\t" + myexon.getArea() + "\t" + str(myexon.getDistance()) + "\t" + str(myexon.getTSSdistance()) + "\t" + str(myexon.getTTSdistance()) + "\t" + str("{0:.2f}".format(myexon.getPRegion())) +
                    "\t" + str("{0:.2f}".format(myexon.getPArea())) + (("\t" + "\t".join(metainfo)[:-1]) if len(metainfo) > 0 else "") + "\n")
        else:
            # Dictionary with positions where we can find a gene in myfinaloutput
            # Example: { gene1: [pos1, pos3], gene2: [pos2]}
            mygenes = {}
            for pos in range(len(toreport)):
                gene_id = toreport[pos].getGene()
                if gene_id not in mygenes:
                    mygenes[gene_id] = [pos]
                else:
                    mygenes[gene_id].append(pos)

            toreport = selectTranscript(toreport, mygenes)
            # Report the vector toreport
            for myexon in toreport:
                outobj.write(dhs_id + "\t" + str(pm) + "\t" + myexon.getGene() + "\t" + myexon.getTranscript() + "\t" +
                    myexon.getExonNr() + "\t" + myexon.getArea() + "\t" + str(myexon.getDistance()) + "\t" + str(myexon.getTSSdistance()) + "\t" + str(myexon.getTTSdistance()) + "\t" + str("{0:.2f}".format(myexon.getPRegion())) +
                    "\t" + str("{0:.2f}".format(myexon.getPArea())) + (("\t" + "\t".join(metainfo)[:-1]) if len(metainfo) > 0 else "") + "\n")


def run(gtf, dhs, outputfile, match_table, options, managed_queue):
    #############################################
    ## CODE ADDED BY RAFA (modified by Carlos) ##
    # Global variables
    try:
        global rules
        global perc_area
        global perc_region
        global tss
        global tts
        global promotor
        global distance
        global level
        global gene_id_tag
        global tran_id_tag
        global gene_id_re
        global tran_id_re
        global ignore_missing
        global check_strand

        presortedGTF   = options.get("presortedGTF", False)
        rules          = options.get("rules", rules)
        perc_area      = options.get("perc_area", perc_area)
        perc_region    = options.get("perc_region", perc_region)
        tss            = options.get("tss", tss)
        tts            = options.get("tts", tts)
        promotor       = options.get("promoter", promotor)
        distance       = options.get("distance", distance)
        level          = options.get("level", level)
        gene_id_tag    = options.get("gene_id_tag", gene_id_tag)
        tran_id_tag    = options.get("tran_id_tag", tran_id_tag)
        ignore_missing = options.get("ignore_missing", ignore_missing)
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
        allGenes  = {}
        # Flags will tell me if "transcript" and "gene" flags can be found inside the GTF file. If they are not found,
        # the start and end positions will have to be measured based on the exons.
        geneFlag  = False
        transFlag = False

        # Prepare a match table to transform the GTF chromosome/scaffolds IDs to the
        # ones used in the BED regions file
        if match_table is not None:
            with open(match_table, 'r') as table_file:
                match_table = dict(match_line.strip().split('\t') for match_line in table_file)

        for line in inputGTF:
            # Avoid comments
            if line and line[0] != "#":
                linea_split = line.split("\t")
                chrom = linea_split[0]
                start = int(linea_split[3])
                end   = int(linea_split[4])
                strand = linea_split[6]

                popurri = linea_split[8]

                # Rename chrom if match_table exists
                if match_table is not None:
                    chrom = match_table[chrom]

                if linea_split[2] == "exon":

                    gene_id       = re.search(gene_id_re, popurri).group(1)
                    transcript_id = re.search(tran_id_re, popurri).group(1)

                    # The exon number will be calculated later
                    exon_number = None

                    myexon = Myexons(start, end, exon_number)

                    flag_transcript = False
                    if transcript_id not in allTranscripts:
                        allTranscripts[transcript_id] = Mytranscripts(transcript_id)
                        flag_transcript = True
                    allTranscripts[transcript_id].addExon(myexon)

                    if chrom not in genes:
                        genes[chrom] = []

                    if gene_id not in allGenes:
                        allGenes[gene_id] = Mygenes(gene_id, strand)
                        genes[chrom].append(allGenes[gene_id])
                    if flag_transcript is True:
                        # Transcript not added in gene
                        allGenes[gene_id].addTranscript(allTranscripts[transcript_id])


                elif linea_split[2] == "transcript":

                    transFlag = True

                    gene_id = re.search(gene_id_re, popurri).group(1)
                    transcript_id = re.search(tran_id_re, popurri).group(1)

                    flag_transcript = False
                    if transcript_id not in allTranscripts:
                        allTranscripts[transcript_id] = Mytranscripts(transcript_id)
                        flag_transcript = True
                    allTranscripts[transcript_id].setLength(start, end)

                    if chrom not in genes:
                        genes[chrom] = []

                    if gene_id not in allGenes:
                        allGenes[gene_id] = Mygenes(gene_id, strand)
                        genes[chrom].append(allGenes[gene_id])
                    if flag_transcript is True:
                        # Transcript not added in gene
                        allGenes[gene_id].addTranscript(allTranscripts[transcript_id])


                elif linea_split[2] == "gene":

                    geneFlag = True

                    gene_id = re.search(gene_id_re, popurri).group(1)


                    if chrom not in genes:
                        genes[chrom] = []

                    if gene_id not in allGenes:
                        allGenes[gene_id] = Mygenes(gene_id, strand)
                        genes[chrom].append(allGenes[gene_id])
                    allGenes[gene_id].setLength(start, end)

        if gtf[-2:] == "gz":
            inputGTF = None
        else:
            inputGTF.close()

        # Check exon number in transcripts
        for gene_id in allGenes:
            for transcript in allGenes[gene_id].getTranscripts():
                transcript.checkExonNumbers(allGenes[gene_id].getStrand())

                if transFlag is False:
                    allTranscripts[transcript.getTranscriptID()].calculateSize()

        if geneFlag is False:
            for gene in allGenes:
                allGenes[gene].calculateSize()

        inputDHS = None
        if dhs[-2:] == "gz":
            aux = gzip.open(dhs, 'rU').read().decode()
            inputDHS = aux.split("\n")
        else:
            inputDHS = open(dhs, 'rU')
        myregions = {}
        myheader = []

        for dhs_line in inputDHS:

            if dhs_line:
                line = dhs_line.split("\t")
                if len(line) >= 3:
                    try:
                        chrom = line[0]
                        start = int(line[1])
                        end = int(line[2])
                        strand = None

                        # Select up to 9 additional bed columns
                        metainfo = line[3:12]

                        # In BED files strand is the optional column 6 (third position of metainfo)
                        if len(metainfo) > 2:
                            strand = metainfo[2].strip()

                        if chrom not in myregions:
                            myregions[chrom] = []

                        myregions[chrom].append([start,end, metainfo, strand])
                    except:
                        # If cannot convert start and end to int, it must be a header
                        # Ignore it as it currently does not contain any relevant info
                        continue

        if dhs[-2:] == "gz":
            inputDHS = None
        else:
            inputDHS.close()

        # Ensure that extra columns have a header
        bed_extra_columns = ["name", "score", "strand", "thickStart", "thickEnd",
                             "itemRgb", "blockCount", "blockSizes", "blockStarts"]

        myheader = bed_extra_columns[:len(metainfo)]

        salida = open(outputfile,'w')
        salida.write("#Region\tMidpoint\tGene\tTranscript\tExon/Intron\tArea\tDistance\tTSSDistance\tTTSDistance\tPercRegion\tPercArea" + (("\t" + "\t".join(myheader)) if len(myheader) > 0 else "") + "\n")

        last_index = None
        old_chrom = ""
        gene_vector = None

        # Check if all chromosomes present in the regions file are also in the reference file
        if not set(myregions.keys()).issubset(set(genes.keys())):
            sys.stderr.write("\nWARNING: there are chromosomes/scaffolds in your BED file that are not present in your GTF file.\n")

            if ignore_missing:
                sys.stderr.write("\nWARNING: option enabled to ignore missing regions, discarding chromosomes/scaffolds not available in GTF file.\n")
                myregions = {key : myregions[key] for key in set(myregions.keys()) & set(genes.keys())}
            else:
                sys.stderr.write("\nERROR: aborting execution due to incomplete GTF file, provide a different one or enable the '--ignore_missing' flag.\n")
                raise Exception("Aborting execution due to incomplete GTF file, provide a different one or enable the '--ignore_missing' flag")

        for chrom in myregions:

            last_index = 0
            gene_vector = sorted(genes[chrom], key = lambda tup:tup.getStart())
            all_regions = sorted(myregions[chrom], key= lambda tup:tup[0])

            for one_region in all_regions:
                start = int(one_region[0])
                end = int(one_region[1])
                metainfo = one_region[2]
                pm = (end+start)/2
                dhs_id = chrom + "_" + str(start) + "_" + str(end)
                region_length  = end - start + 1
                strand = one_region[3]

                # Start analysis
                down = sys.maxsize # Distance to TTS
                exon_down = None
                last_index_down = last_index

                upst = sys.maxsize # Distance to TSS
                exon_up = None
                last_index_up = last_index

                last_index_body = last_index

                block_last_index = -1

                # When flagGeneBody is False, we will report downstream or upstream exons
                # Otherwise, we will only report the overlapped exons
                flagGeneBody = False

                # Array containing the relations that are going to be reported
                # [Candidate's]
                myfinaloutput = []

                # This dictionaries will contain as a key [geneID_transcriptID] and as values will be a vector
                # containing [[Candidate, area_length, overlapped_area],[Candidate, area_length, overlapped_area]...]
                # This is because there will be regions that will overlap different introns or exons, so we need to have all
                # this information, and once we know all the overlaps, we will recalculate the percentages of overlap.
                myIntrons = {}
                myGeneBodys = {}

                for i in range(last_index, len(gene_vector)):

                    mygene = gene_vector[i]

                    # If enabled, force the strand checking and skip if they are not equal
                    if check_strand and strand != None and mygene.getStrand() != strand:
                        continue

                    distanceToStartGene = abs(mygene.getStart() - pm)

                    if mygene.getStart() > end and (flagGeneBody is True or down < distanceToStartGene or upst < distanceToStartGene):

                        # We update the point from we will keep on looking at exons for new regions
                        if block_last_index == -1: # We can keep updating
                            last_index = last_index_down if last_index_down < last_index_up else last_index_up
                            last_index = last_index_body if last_index_body < last_index else last_index
                        else:
                            last_index = block_last_index


                        break

                    else: # Check associations
                        for mytranscript in mygene.getTranscripts():

                            myexons = mytranscript.getExons()

                            # Calculate TSSdist using the first exon "start" position.
                            # With positive strands ([0] = first exon), the
                            # position will be getStart().
                            # In negative strands ([-1]), the position will be getEnd()
                            if (myexons[0].getExon() == '1'):
                                TSSdistance = myexons[0].getStart() - pm
                                TTSdistance = myexons[-1].getEnd() - pm
                            else:
                                TSSdistance = pm - myexons[-1].getEnd()
                                TTSdistance = pm - myexons[0].getStart()

                            for j in range(len(myexons)):

                                exon = myexons[j]
                                isFirstExon = True if j == 0 else False
                                isLastExon  = True if j == (len(myexons) - 1) else False
                                exon_length    = exon.getEnd() - exon.getStart() + 1

                                # 1. Exon before the region
                                #
                                #     <--------->
                                #                    |--------------|
                                #

                                if exon.getEnd() < start:

                                    # Check whether the current gene also covers the region
                                    if block_last_index == -1 and mygene.getEnd() > start:
                                        block_last_index = i

                                    dist_tmp = pm - exon.getEnd()
                                    # Check if it's the last exon
                                    if isLastExon is True:
                                        if mygene.getStrand() == "+" and dist_tmp < down:
                                            down = dist_tmp
                                            exon_down = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), "DOWNSTREAM", mytranscript.getTranscriptID(), mygene.getGeneID(),down, 100, -1, TSSdistance, TTSdistance)
                                            last_index_down = i
                                        elif mygene.getStrand() == "-" and dist_tmp < upst:
                                            upst = dist_tmp
                                            exon_up = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), "UPSTREAM", mytranscript.getTranscriptID(), mygene.getGeneID(),upst, 100, -1, TSSdistance, TTSdistance)
                                            last_index_up = i

                                    else:
                                        # Check if the next exon is closer to the region
                                        next_exon = myexons[j+1]

                                        if next_exon.getStart() > start:
                                            flagGeneBody = True
                                            intron_length = next_exon.getStart() - exon.getEnd() - 1
                                            # The next exon is after the region
                                            if next_exon.getStart() > end:
                                                pctg_region   = 100
                                                pctg_area     = (float(region_length)/intron_length)*100
                                                intron_number = (j + 1) if mygene.getStrand() == "+" else (len(myexons) - 1 - j)

                                                myid = mygene.getGeneID() + "_" + mytranscript.getTranscriptID()
                                                intron_candidate = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), str(intron_number), "INTRON", mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance)
                                                if myid not in myIntrons:
                                                    myIntrons[myid] = [[intron_candidate, intron_length, region_length]]
                                                else:
                                                    myIntrons[myid].append([intron_candidate, intron_length, region_length])

                                                break
                                            # The next exon overlaps with the region
                                            else:
                                                region_overlap = next_exon.getStart() - start
                                                pctg_region    = (float(region_overlap)/region_length)*100
                                                pctg_area      = (float(region_overlap)/intron_length)*100
                                                intron_number = (j + 1) if mygene.getStrand() == "+" else (len(myexons) - 1 - j)

                                                myid = mygene.getGeneID() + "_" + mytranscript.getTranscriptID()
                                                intron_candidate = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), str(intron_number), "INTRON", mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance)
                                                if myid not in myIntrons:
                                                    myIntrons[myid] = [[intron_candidate, intron_length, region_overlap]]
                                                else:
                                                    myIntrons[myid].append([intron_candidate, intron_length, region_overlap])

                                # 2. Exon overlapping partially the region
                                #
                                #     <--------->
                                #          |--------------|
                                #
                                elif start <= exon.getEnd() <= end and exon.getStart() <  start:

                                    if last_index_body == last_index:
                                        last_index_body = i

                                    flagGeneBody = True
                                    body_overlap = exon.getEnd() - start + 1
                                    pctg_region  = (float(body_overlap)/region_length)*100
                                    pctg_area    = (float(body_overlap)/exon_length) * 100

                                    if isFirstExon and mygene.getStrand() == "+" or isLastExon and mygene.getStrand() == "-":
                                        tag = "1st_EXON"
                                        myfinaloutput.append(Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance))
                                    else:
                                        tag = "GENE_BODY"
                                        myid = mygene.getGeneID() + "_" + mytranscript.getTranscriptID()
                                        gb_candidate = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance)
                                        if myid not in myGeneBodys:
                                            myGeneBodys[myid] = [[gb_candidate, exon_length, body_overlap]]
                                        else:
                                            myGeneBodys[myid].append([gb_candidate, exon_length, body_overlap])

                                    if exon.getEnd() < end:
                                        if isLastExon is True:
                                            region_overlap = end - exon.getEnd()
                                            pctg_region    = (float(region_overlap)/region_length)*100
                                            if mygene.getStrand() == "+":
                                                tag = "DOWNSTREAM"
                                                exon_down = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, -1, TSSdistance, TTSdistance)
                                                if tts > 0:
                                                    mychecks = checkTTS(start, end, exon_down)
                                                    for assoc in mychecks:
                                                        myfinaloutput.append(Candidate(exon_down.getStart(), exon_down.getEnd(), exon_down.getStrand(), exon_down.getExonNr(), assoc[0], exon_down.getTranscript(), exon_down.getGene(), exon_down.getDistance(), assoc[1], assoc[2], TSSdistance, TTSdistance))
                                                else:
                                                    myfinaloutput.append(exon_down)
                                            else:
                                                tag = "UPSTREAM"
                                                exon_up = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, -1, TSSdistance, TTSdistance)
                                                mychecks = checkTSS(start, end, exon_up)
                                                for assoc in mychecks:
                                                    myfinaloutput.append(Candidate(exon_up.getStart(), exon_up.getEnd(), exon_up.getStrand(), exon_up.getExonNr(), assoc[0], exon_up.getTranscript(), exon_up.getGene(), exon_up.getDistance(), assoc[1], assoc[2], TSSdistance, TTSdistance))

                                        else:

                                            next_exon = myexons[j+1]

                                            intron_length  = next_exon.getStart() - exon.getEnd() - 1
                                            intron_number = (j + 1) if mygene.getStrand() == "+" else (len(myexons) - 1 - j)

                                            if next_exon.getStart() > end:
                                                region_overlap = end - exon.getEnd()
                                                pctg_region    = (float(region_overlap)/region_length)*100
                                                pctg_area      = (float(region_overlap)/intron_length)*100

                                                myid = mygene.getGeneID() + "_" + mytranscript.getTranscriptID()
                                                intron_candidate = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), str(intron_number), "INTRON", mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance)
                                                if myid not in myIntrons:
                                                    myIntrons[myid] = [[intron_candidate, intron_length, region_overlap]]
                                                else:
                                                    myIntrons[myid].append([intron_candidate, intron_length, region_overlap])

                                                break
                                            else:
                                                region_overlap = next_exon.getStart() - exon.getEnd() - 1
                                                pctg_region    = (float(region_overlap)/region_length)*100
                                                pctg_area      = (float(region_overlap)/intron_length)*100

                                                myid = mygene.getGeneID() + "_" + mytranscript.getTranscriptID()
                                                intron_candidate = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), str(intron_number), "INTRON", mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance)
                                                if myid not in myIntrons:
                                                    myIntrons[myid] = [[intron_candidate, intron_length, region_overlap]]
                                                else:
                                                    myIntrons[myid].append([intron_candidate, intron_length, region_overlap])

                                # 3. Exon completely inside the region
                                #
                                #     <--------->
                                #   |--------------|
                                #
                                elif start <= exon.getStart() and end >= exon.getEnd():
                                    flagGeneBody = True

                                    if start < exon.getStart():
                                        if isFirstExon is True:
                                            region_overlap = exon.getStart() - start
                                            pctg_region = (float(region_overlap)/region_length)*100

                                            if mygene.getStrand() == "-":
                                                tag = "DOWNSTREAM"
                                                exon_down = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, -1, TSSdistance, TTSdistance)
                                                if tts > 0:
                                                    mychecks = checkTTS(start, end, exon_down)
                                                    for assoc in mychecks:
                                                        myfinaloutput.append(Candidate(exon_down.getStart(), exon_down.getEnd(), exon_down.getStrand(), exon_down.getExonNr(), assoc[0], exon_down.getTranscript(), exon_down.getGene(), exon_down.getDistance(), assoc[1], assoc[2], TSSdistance, TTSdistance))
                                                else:
                                                    myfinaloutput.append(exon_down)

                                            else:
                                                tag = "UPSTREAM"
                                                exon_up = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, -1, TSSdistance, TTSdistance)
                                                mychecks = checkTSS(start, end, exon_up)
                                                for assoc in mychecks:
                                                    myfinaloutput.append(Candidate(exon_up.getStart(), exon_up.getEnd(), exon_up.getStrand(), exon_up.getExonNr(), assoc[0], exon_up.getTranscript(), exon_up.getGene(), exon_up.getDistance(), assoc[1], assoc[2], TSSdistance, TTSdistance))

                                    region_overlap = exon.getEnd() - exon.getStart() + 1
                                    pctg_region = (float(region_overlap)/region_length)*100
                                    pctg_area   = 100

                                    if isFirstExon and mygene.getStrand() == "+" or isLastExon and mygene.getStrand() == "-":
                                        tag = "1st_EXON"
                                        myfinaloutput.append(Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance))
                                    else:
                                        tag = "GENE_BODY"
                                        myid = mygene.getGeneID() + "_" + mytranscript.getTranscriptID()
                                        gb_candidate = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance)
                                        if myid not in myGeneBodys:
                                            myGeneBodys[myid] = [[gb_candidate, exon_length, exon_length]]
                                        else:
                                            myGeneBodys[myid].append([gb_candidate, exon_length, exon_length])

                                    if end > exon.getEnd():
                                        if isLastExon is True:
                                            region_overlap = end - exon.getEnd()
                                            pctg_region    = (float(region_overlap)/region_length)*100

                                            if mygene.getStrand() == "+":
                                                tag = "DOWNSTREAM"
                                                exon_down = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, -1, TSSdistance, TTSdistance)
                                                if tts > 0:
                                                    mychecks = checkTTS(start, end, exon_down)
                                                    for assoc in mychecks:
                                                        myfinaloutput.append(Candidate(exon_down.getStart(), exon_down.getEnd(), exon_down.getStrand(), exon_down.getExonNr(), assoc[0], exon_down.getTranscript(), exon_down.getGene(), exon_down.getDistance(), assoc[1], assoc[2], TSSdistance, TTSdistance))
                                                else:
                                                    myfinaloutput.append(exon_down)
                                            else:
                                                tag = "UPSTREAM"
                                                exon_up = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, -1, TSSdistance, TTSdistance)
                                                mychecks = checkTSS(start, end, exon_up)
                                                for assoc in mychecks:
                                                    myfinaloutput.append(Candidate(exon_up.getStart(), exon_up.getEnd(), exon_up.getStrand(), exon_up.getExonNr(), assoc[0], exon_up.getTranscript(), exon_up.getGene(), exon_up.getDistance(), assoc[1], assoc[2], TSSdistance, TTSdistance))

                                        else:

                                            next_exon = myexons[j+1]

                                            intron_length  = next_exon.getStart() - exon.getEnd() - 1
                                            intron_number = (j + 1) if mygene.getStrand() == "+" else (len(myexons) - 1 - j)
                                            if next_exon.getStart() > end:
                                                region_overlap = end - exon.getEnd()
                                                pctg_region    = (float(region_overlap)/region_length)*100
                                                pctg_area      = (float(region_overlap)/intron_length)*100

                                                myid = mygene.getGeneID() + "_" + mytranscript.getTranscriptID()
                                                intron_candidate = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), str(intron_number), "INTRON", mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance)
                                                if myid not in myIntrons:
                                                    myIntrons[myid] = [[intron_candidate, intron_length, region_overlap]]
                                                else:
                                                    myIntrons[myid].append([intron_candidate, intron_length, region_overlap])

                                                break
                                            else:
                                                region_overlap = next_exon.getStart() - exon.getEnd() - 1
                                                pctg_region    = (float(region_overlap)/region_length)*100
                                                pctg_area      = (float(region_overlap)/intron_length)*100

                                                myid = mygene.getGeneID() + "_" + mytranscript.getTranscriptID()
                                                intron_candidate = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), str(intron_number), "INTRON", mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance)
                                                if myid not in myIntrons:
                                                    myIntrons[myid] = [[intron_candidate, intron_length, region_overlap]]
                                                else:
                                                    myIntrons[myid].append([intron_candidate, intron_length, region_overlap])

                                # 4. Exon overlapping the region but shifted to the right
                                #
                                #             <--------->
                                #   |--------------|
                                #
                                elif start <= exon.getStart() <= end and end < exon.getEnd():
                                    flagGeneBody = True
                                    if start < exon.getStart():
                                        if isFirstExon is True:
                                            region_overlap = exon.getStart() - start
                                            pctg_region = (float(region_overlap)/region_length)*100

                                            if mygene.getStrand() == "-":
                                                tag = "DOWNSTREAM"
                                                exon_down = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, -1, TSSdistance, TTSdistance)
                                                if tts > 0:
                                                    mychecks = checkTTS(start, end, exon_down)
                                                    for assoc in mychecks:
                                                        myfinaloutput.append(Candidate(exon_down.getStart(), exon_down.getEnd(), exon_down.getStrand(), exon_down.getExonNr(), assoc[0], exon_down.getTranscript(), exon_down.getGene(), exon_down.getDistance(), assoc[1], assoc[2], TSSdistance, TTSdistance))
                                                else:
                                                    myfinaloutput.append(exon_down)

                                            else:
                                                tag = "UPSTREAM"
                                                exon_up = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, -1, TSSdistance, TTSdistance)
                                                mychecks = checkTSS(start, end, exon_up)
                                                for assoc in mychecks:
                                                    myfinaloutput.append(Candidate(exon_up.getStart(), exon_up.getEnd(), exon_up.getStrand(), exon_up.getExonNr(), assoc[0], exon_up.getTranscript(), exon_up.getGene(), exon_up.getDistance(), assoc[1], assoc[2], TSSdistance, TTSdistance))

                                    region_overlap = end - exon.getStart() + 1
                                    pctg_region    = (float(region_overlap)/region_length)*100
                                    pctg_area      = (float(region_overlap)/exon_length)*100

                                    if isFirstExon and mygene.getStrand() == "+" or isLastExon and mygene.getStrand() == "-":
                                        tag = "1st_EXON"
                                        myfinaloutput.append(Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(), 0, pctg_region, pctg_area, TSSdistance, TTSdistance))
                                    else:
                                        tag = "GENE_BODY"
                                        myid = mygene.getGeneID() + "_" + mytranscript.getTranscriptID()
                                        gb_candidate = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(), 0, pctg_region, pctg_area, TSSdistance, TTSdistance)
                                        if myid not in myGeneBodys:
                                            myGeneBodys[myid] = [[gb_candidate, exon_length, region_overlap]]
                                        else:
                                            myGeneBodys[myid].append([gb_candidate, exon_length, region_overlap])

                                # 5. Region completely within the exon
                                #
                                #             <----------------->
                                #                 |---------|
                                #
                                elif exon.getStart() <= start <= exon.getEnd() and end < exon.getEnd():

                                    if last_index_body == last_index:
                                        last_index_body = i

                                    flagGeneBody = True
                                    region_overlap = region_length
                                    pctg_region    = 100
                                    pctg_area      = (float(region_overlap)/exon_length) * 100

                                    if isFirstExon and mygene.getStrand() == "+" or isLastExon and mygene.getStrand() == "-":
                                        tag = "1st_EXON"
                                        myfinaloutput.append(Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance))
                                    else:
                                        tag = "GENE_BODY"
                                        myid = mygene.getGeneID() + "_" + mytranscript.getTranscriptID()
                                        gb_candidate = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), tag, mytranscript.getTranscriptID(), mygene.getGeneID(),0, pctg_region, pctg_area, TSSdistance, TTSdistance)
                                        if myid not in myGeneBodys:
                                            myGeneBodys[myid] = [[gb_candidate, exon_length, region_overlap]]
                                        else:
                                            myGeneBodys[myid].append([gb_candidate, exon_length, region_overlap])

                                # 6. Exon totally after the region
                                #
                                #                       <----------------->
                                #   |---------|
                                #
                                elif exon.getStart() > end:
                                    if isFirstExon is True:

                                        dist_tmp = exon.getStart() - pm

                                        if mygene.getStrand() == "-" and dist_tmp < down:
                                            down = dist_tmp
                                            exon_down = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), "DOWNSTREAM", mytranscript.getTranscriptID(), mygene.getGeneID(), down, 100, -1, TSSdistance, TTSdistance)
                                        elif mygene.getStrand() == "+" and dist_tmp < upst:
                                            upst = dist_tmp
                                            exon_up = Candidate(exon.getStart(), exon.getEnd(), mygene.getStrand(), exon.getExon(), "UPSTREAM", mytranscript.getTranscriptID(), mygene.getGeneID(), upst, 100, -1, TSSdistance, TTSdistance)

                                        if down <= dist_tmp and upst <= dist_tmp:
                                            break

                if (down < upst or down == upst) and exon_down is not None and exon_down.getDistance() <= distance:
                    # Report Downstream
                    if tts > 0:
                        mychecks = checkTTS(start, end, exon_down)
                        for assoc in mychecks:
                            myfinaloutput.append(Candidate(exon_down.getStart(), exon_down.getEnd(), exon_down.getStrand(), exon_down.getExonNr(), assoc[0], exon_down.getTranscript(), exon_down.getGene(), exon_down.getDistance(), assoc[1], assoc[2], exon_down.getTSSdistance(), exon_down.getTTSdistance()))
                    else:
                        myfinaloutput.append(exon_down)

                if (upst < down or upst == down) and exon_up is not None and exon_up.getDistance() <= distance:
                    mychecks = checkTSS(start, end, exon_up)
                    for assoc in mychecks:
                        myfinaloutput.append(Candidate(exon_up.getStart(), exon_up.getEnd(), exon_up.getStrand(), exon_up.getExonNr(), assoc[0], exon_up.getTranscript(), exon_up.getGene(), exon_up.getDistance(), assoc[1], assoc[2], exon_up.getTSSdistance(), exon_up.getTTSdistance()))

                if flagGeneBody is True:
                    # Sum up cases overlapping different exons of the gene body
                    for myid in myGeneBodys:
                        if len(myGeneBodys[myid]) == 1:
                            myfinaloutput.append(myGeneBodys[myid][0][0])
                        else:
                            total_area = 0
                            total_overlap = 0
                            exon_nr = ""
                            for candidate in myGeneBodys[myid]:
                                total_area += candidate[1]
                                total_overlap += candidate[2]
                                myexon = candidate[0]
                                exon_nr = exon_nr + myexon.getExonNr() + ","
                            myexon = myGeneBodys[myid][0][0]
                            pctg_region = (float(total_overlap)/region_length)*100
                            pctg_area   = (float(total_overlap)/total_area)*100
                            myfinaloutput.append(Candidate(myexon.getStart(), myexon.getEnd(), myexon.getStrand(), exon_nr[:-1], myexon.getArea(), myexon.getTranscript(), myexon.getGene(), myexon.getDistance(), pctg_region, pctg_area, myexon.getTSSdistance(), myexon.getTTSdistance()))

                    # Sum up cases overlapping different introns of the gene body
                    for myid in myIntrons:
                        if len(myIntrons[myid]) == 1:
                            myfinaloutput.append(myIntrons[myid][0][0])
                        else:
                            total_area = 0
                            total_overlap = 0
                            intron_nr = ""
                            for candidate in myIntrons[myid]:
                                total_area += candidate[1]
                                total_overlap += candidate[2]
                                myexon = candidate[0]
                                intron_nr = intron_nr + myexon.getExonNr() + ","
                            myexon = myIntrons[myid][0][0]
                            pctg_region = (float(total_overlap)/region_length)*100
                            pctg_area   = (float(total_overlap)/total_area)*100
                            myfinaloutput.append(Candidate(myexon.getStart(), myexon.getEnd(), myexon.getStrand(), intron_nr[:-1], myexon.getArea(), myexon.getTranscript(), myexon.getGene(), myexon.getDistance(), pctg_region, pctg_area, myexon.getTSSdistance(), myexon.getTTSdistance()))

                reportOutput(myfinaloutput, dhs_id, start, end, salida, metainfo)

        salida.close()

        # CODE ADDED BY RAFA
        keys = allTranscripts.keys()
        for i in keys:
            del allTranscripts[i]

        import gc
        gc.collect()
        gc.enable()

        # Need to put something at the queue
        managed_queue.put(None)
    except Exception as e:
        managed_queue.put(e)
        raise e


if __name__ == "__main__":
    main()

