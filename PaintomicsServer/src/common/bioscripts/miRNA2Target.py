#***************************************************************
#  This file is part of PaintOmics 3
#
#  PaintOmics 3 is free software: you can redistribute it and/or
#  modify it under the terms of the GNU General Public License as
#  published by the Free Software Foundation, either version 3 of
#  the License, or (at your option) any later version.
#
#  PaintOmics 3 is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with PaintOmics 3.  If not, see <http://www.gnu.org/licenses/>.
#  Contributors:
#     Rafael Hernandez de Diego <paintomics@cipf.es>
#     Ana Conesa Cegarra
#     and others
#
#  More info http://bioinfo.cipf.es/paintomics
#  Technical contact paintomics@cipf.es
#
#**************************************************************

import getopt
import sys
import os.path
import scipy.stats

def main():
    try:
        opts, args = getopt.getopt(sys.argv[1:], "h:m:g:r:i:o:", ["help", "method=", "genes=", "reference=", "mirna=", "output="])
    except getopt.GetoptError as err:
        print(err) # will print something like "option -a not recognized"
        print_usage()
        sys.exit(2)

    referenceFile = None
    dataFile = None
    geneExpresion = None
    outputfile = None
    method = None

    if len(opts) == 0:
        print_usage()

    for o, a in opts:
        if o in ("-h","--help"):
            print_usage()
            sys.exit()
        elif o in ("-r", "--reference"):
            if os.path.isfile(a):
                referenceFile = a
            else:
                sys.stderr.write("\nERROR: Reference file not recognized.\n")
                print_usage()
                sys.exit()
        elif o in ("-i", "--mirna"):
            if os.path.isfile(a):
                dataFile = a
            else:
                sys.stderr.write("\nERROR: miRNA file not recognized.\n")
                print_usage()
                sys.exit()
        elif o in ("-o", "--output"):
            outputfile = a
        elif o in ("-g", "--genes"):
            geneExpresion = a
        elif o in ("-m", "--method"):
            method = a
        else:
            print "Unknown option"
            print "Use python miRNA2Target.py -h for help"

    if referenceFile is not None and dataFile is not None and outputfile is not None:
        run(referenceFile, dataFile, outputfile, geneExpresion, method)

def print_usage():
    print "\nUsage: python miRNA2Target.py [options] <mandatory>"
    print "Options:"
    print "\t-m, --method:\n\t\t The score method, accepted values are 'fc' (Fold change) | 'spearman' | 'kendall' | 'pearson'"
    print "\t-g, --genes:\n\t\t A file containing the gene expression quantification. These values are necessary to calculate the correlation between miRNAs and targets."
    print "\t-h, --help:\n\t\t show this help message and exit"
    print "Mandatory:"
    print "\t-r, --reference:\n\t\t The reference file"
    print "\t-i, --mirna:\n\t\t The miRNA quantification file"
    print "\t-o, --output:\n\t\t Output file"
    print "\nVersion 0.1 August 2016\n"


def run(referenceFile, dataFile, geneExpresion, outputFile, method="fc"):
    miRNAtable = {}
    geneTable = {}
    dataFile_header = ""

    #STEP 1. GENERATE THE TABLE WITH ALL THE MIRNAS IN THE INPUT
    with open(dataFile, 'r') as f:
        dataFile_header = f.readline().split("\t")[1:]
        for line in f:
            line = line.split("\t")
            miRNAtable[line[0]] = {"values" : line[1:], "targets" : [] }
    f.close()

    #STEP 2. FILL THE TABLE WITH ALL THE TARGETS FOR EACH MIRNA
    with open(referenceFile, 'r') as f:
        for line in f:
            line = line.split("\t")
            if line[0] in miRNAtable:
                miRNAtable[line[0]]["targets"].append(line[1])
    f.close()

    #STEP 3. FILL THE TABLE WITH ALL THE GENES
    if geneExpresion != None:
        with open(geneExpresion, 'r') as f:
            for line in f:
                line = line.split("\t")
                geneTable[line[0]] = line[1:]
        f.close()
    else:
        method = "fc"

    #STEP 4. FOR EACH MIRNA AND EACH TARGET, CALCULATE THE SCORE AND SAVE RESULTS TO A FILE
    try:
        outputFile = open(outputFile, 'w')
        outputFile.write("# miRNA_id\ttarget_id\tscore\tscore method\t" + "\t".join(dataFile_header))

        miRNA_id = miRNA_values = miRNA_targets = target_id = target_values = score = None
        for miRNA_id in miRNAtable:
            miRNA_values = miRNAtable[miRNA_id]["values"]
            miRNA_targets = miRNAtable[miRNA_id]["targets"]
            for target_id in miRNA_targets:
                target_values = geneTable.get(target_id, None)
                if method == "fc" or target_values is not None:
                    score = getScore(miRNA_values, target_values, method)
                    outputFile.write(miRNA_id + "\t" + target_id + "\t" + str(score) + "\t" + method + "\t" + "\t".join(miRNA_values))
    except Exception as e:
        pass
    finally:
        outputFile.close()

    return True

def getScore(values_1, values_2, method):
    if method == "fc":
        #CALCULATE THE FOLD CHANGE
        import random
        return random.uniform(-1, 1)
    elif method == "spearman":
        #CALCULATE THE CORRELATION USING SPEARMAN
        return scipy.stats.spearmanr(map(float, values_1), map(float, values_2)).correlation
    elif method == "kendall":
        #CALCULATE THE CORRELATION USING KENDALL
        return scipy.stats.kendalltau(map(float, values_1), map(float, values_2)).correlation
    elif method == "pearson":
        #CALCULATE THE CORRELATION USING PEARSON
        return scipy.stats.pearsonr(map(float, values_1), map(float, values_2))[0]

if __name__ == "__main__":
    main()
