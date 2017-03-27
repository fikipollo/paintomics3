EXTERNAL_RESOURCES = {
                "ensembl"   :   [
                    {
                    "url"           :   "http://www.ensembl.org/biomart/martservice/",
                    "file"          :   "mmu_resources/ensembl_mapping.xml",
                    "output"        :   "ensembl_mapping.list",
                    "description"   :   "Source: Ensembl Mammals databases. Downloaded from Biomart."
                    }
                ],
                "refseq"   :  [
                    {
                    "url"           :   "ftp://ftp.ncbi.nih.gov/gene/DATA/",
                    "file"          :   "gene2refseq.gz",
                    "output"        :   "refseq_gene2refseq.gz",
                    "description"   :   "Source: NCBI Gene. Downloaded from NCBI FTP. Tab-delimited one line per genomic/RNA/protein set of RefSeqs",
                    "specie-code"   :   10090
                    },{
                    "url"           :   "ftp://ftp.ncbi.nih.gov/gene/DATA/GENE_INFO/Mammalia/",
                    "file"          :   "Mus_musculus.gene_info.gz",
                    "output"        :   "refseq_gene2genesymbol.gz",
                    "description"   :   "Source: NCBI Gene. Downloaded from NCBI FTP. Tab-delimited one line per gene id/gene symbol/.../synonyms/... from RefSeqs",
                    "specie-code"   :   10090
                    }
                ],
                 "uniprot"   :   [
                    {
                    "url"           :   "ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/knowledgebase/idmapping/by_organism/",
                    "file"          :   "MOUSE_10090_idmapping_selected.tab.gz",
                    "output"        :   "uniprot_mapping.list",
                    "description"   :    "Source: UniProt idmapping_selected.tab. Downloaded from UniProt FTP. Tab-delimited table which includes the multiple mappings between UniProt Accession and external databases."
                    }
                ],
                 "vega"   :   [
                    {
                    "url"           :   "http://www.ensembl.org/biomart/martservice/",
                    "file"          :   "mmu_resources/vega_mapping.xml",
                    "output"        :   "vega_mapping.list",
                    "description"   :    "Source: Ensembl Vega databases. Downloaded from Biomart."
                    }
                ],
        }
