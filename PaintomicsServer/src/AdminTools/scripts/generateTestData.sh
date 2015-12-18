#!/bin/bash

SPECIE=$1
KEGG_DATA=$2

rm -r $KEGG_DATA"/TEST_DATA/"$SPECIE
mkdir $KEGG_DATA"/TEST_DATA/"$SPECIE

cut -f1 $KEGG_DATA"/last/species/"$SPECIE"/gene2pathway.list" | sed 's/trd://g' | sort | uniq > $KEGG_DATA"/TEST_DATA/"$SPECIE"/gene_ids.list"
names=$(cat $KEGG_DATA"/TEST_DATA/"$SPECIE"/gene_ids.list" | cut -f1)

for name in ${names[*]}; do
	printf "%s\t%01d.%03d%02d%03d\t%01d.%03d%02d%03d\n" $name $(( $RANDOM % 4 - $RANDOM % 4)) $(( $RANDOM % 1000 )) $(( $RANDOM % 100)) $(( $RANDOM % 1000 )) $(( $RANDOM % 4 - $RANDOM % 4)) $(( $RANDOM % 1000 )) $(( $RANDOM % 100)) $(( $RANDOM % 100));
done > $KEGG_DATA"/TEST_DATA/"$SPECIE"/mirnaseqRandom.tab"

for name in ${names[*]}; do
	printf "%s\t%01d.%03d%02d%03d\t%01d.%03d%02d%03d\n" $name $(( $RANDOM % 4 - $RANDOM % 4)) $(( $RANDOM % 1000 )) $(( $RANDOM % 100)) $(( $RANDOM % 1000 )) $(( $RANDOM % 4 - $RANDOM % 4)) $(( $RANDOM % 1000 )) $(( $RANDOM % 100)) $(( $RANDOM % 100));
done > $KEGG_DATA"/TEST_DATA/"$SPECIE"/proteomicsRandom.tab"

for name in ${names[*]}; do
	printf "%s\t%01d.%03d%02d%03d\t%01d.%03d%02d%03d\n" $name $(( $RANDOM % 4 - $RANDOM % 4)) $(( $RANDOM % 1000 )) $(( $RANDOM % 100)) $(( $RANDOM % 1000 )) $(( $RANDOM % 4 - $RANDOM % 4)) $(( $RANDOM % 1000 )) $(( $RANDOM % 100)) $(( $RANDOM % 100));
done > $KEGG_DATA"/TEST_DATA/"$SPECIE"/geneExpressionRandom.tab"

