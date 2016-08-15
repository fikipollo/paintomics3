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

# Global variables
method       = "negative_correlation"

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

    global method

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

    options = {"method" : method}

    if referenceFile is not None and dataFile is not None and outputfile is not None:
        run(referenceFile, dataFile, outputfile, geneExpresion, options)

def print_usage():
    print "\nUsage: python miRNA2Target.py [options] <mandatory>"
    print "Options:"
    print "\t-m, --method:\n\t\t The score method, accepted values are 'FC' (Fold change), 'abs_correlation', 'positive_correlation' and 'negative_correlation'"
    print "\t-g, --genes:\n\t\t A file containing the gene expression quantification. These values are necessary to calculate the correlation between miRNAs and targets."
    print "\t-h, --help:\n\t\t show this help message and exit"
    print "Mandatory:"
    print "\t-r, --reference:\n\t\t The reference file"
    print "\t-i, --mirna:\n\t\t The miRNA quantification file"
    print "\t-o, --output:\n\t\t Output file"
    print "\nVersion 0.1 August 2016\n"


def run(referenceFile, dataFile, geneExpresion, outputFile, options):
    dataFile = open(dataFile, 'r')
    outputFile = open(outputFile, 'w')

    import random

    for line in dataFile:
        line = line.split("\t")
        score = random.uniform(-1, 1)
        id = "ENSM000" + str(random.randrange(1, 99999))
        outputFile.write(line[0] + "\t" + id + "\t" + str(score) + "\t" + "\t".join(line[1:]))

    dataFile.close()
    outputFile.close()
    return True

if __name__ == "__main__":
    main()
