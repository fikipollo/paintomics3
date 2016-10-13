EXTERNAL_RESOURCES = {
                "ensembl"   :   [
                    {
                    "url"           :   "http://central.biomart.org/martservice/results",
                    "file"          :   "rno_resources/ensembl_mapping.xml",
                    "output"        :   "ensembl_mapping.list",
                    "description"   :   "Source: Ensembl release 81 - September 2015. Dowloaded from Biomart."
                    }
                ],
                "refseq"   :  [
                    {
                    "url"           :   "ftp://ftp.ncbi.nih.gov/gene/DATA/",
                    "file"          :   "gene2refseq.gz",
                    "output"        :   "refseq_gene2refseq.gz",
                    "description"   :   "Source: NCBI Gene - September 2015. Dowloaded from NCBI FTP. Tab-delimited one line per genomic/RNA/protein set of RefSeqs",
                    "specie-code"   :   10116
                    },{
                    "url"           :   "ftp://ftp.ncbi.nih.gov/gene/DATA/GENE_INFO/Mammalia/",
                    "file"          :   "Rattus_norvegicus.gene_info.gz",
                    "output"        :   "refseq_gene2genesymbol.gz",
                    "description"   :   "Source: NCBI Gene - September 2015. Dowloaded from NCBI FTP. Tab-delimited one line per gene id/gene symbol/.../synonyms/... from RefSeqs",
                    "specie-code"   :   10116
                    }
                ],
                 "uniprot"   :   [
                    {
                    "url"           :   "ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/knowledgebase/idmapping/by_organism/",
                    "file"          :   "RAT_10116_idmapping_selected.tab.gz",
                    "output"        :   "uniprot_mapping.list",
                    "description"   :    "Source: UniProt idmapping_selected.tab - September 2015. Dowloaded from UniProt FTP. Tab-delimited table which includes the multiple mappings between UniProt Accession and external databases."
                    }
                ],
                 "vega"   :   [
                    {
                    "url"           :   "http://central.biomart.org/martservice/results",
                    "file"          :   "rno_resources/vega_mapping.xml",
                    "output"        :   "vega_mapping.list",
                    "description"   :    "Source: Ensembl Vega release 61 - September 2015. Dowloaded from Biomart."
                    }
                ],
        }