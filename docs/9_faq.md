<div class="imageContainer" style="" >
    <img src="paintomics_150x690.png" title="Paintomics LOGO." style=" height: 70px !important; margin-bottom: 20px; ">
</div>

# Accepted Input data

For any question on Paintomics, users can send a mail to [paintomics@cipf.es](mailto:paintomics@cipf.es).

As mentioned previously, the usage of multiple complementary genome-wide measurements is becoming a powerful tool for a better understanding the complexity of biological systems. Within this scenario, any new tool for System Biology cannot ignore this emerging trend and should be able to support multi-omic experiments. Following this idea, Paintomics 3.0 has been developed to accept data from diverse nature, including common techniques such as Transcriptomics, Metabolomics and Proteomics, but also emerging approaches such as DNase-seq, ChIP-seq or Methyl-seq. Resulting, the accepted inputs for Paintomics 3.0 can be broadly classified into 3 categories, depending on the nature of the input data.

1. **Gene-based omics:** this category covers those omic data types where the measured biological entities are o can be translated into genes. Some typical examples are mRNA-seq or Microarrays, where measurements are made at gene or transcript level; and Proteomics, where protein quantification can be imputed to the codifying gene. 

2. **Metabolite-based data:** here we include those omic types where the studied biological entities are o can be assigned to metabolites. This category would includes metabolite quantification using, for example a Liquid chromatography coupled with mass spectrometry (LC-MS).

3. **Region-based omics:** last but no least, this category includes all those omic data types where the information is grouped around a set of genomic locations of interest (genomic regions). Some examples of region-based omics are ChIP-seq data (Chromatin Immunoprecipitation Sequencing) which analyses protein interactions with DNA and generally results in a set of genome regions where the target protein may be bound; or DNase hypersensitivity profiling (DNase-seq), where regions indicate location of regulatory sites sensitive to cleavage by DNase I.In some cases, region-based data can be also translated to gene-based domain for those regions that match totally or partially a gene into the genome.

For current version, acceptable data files must be tab-separated plain text files. User should provide 2 files for each omic data type: a quantification file containing measurements for each biological feature (e.g. gene expression quantification) and a second file with a list of features that user considers relevant for the experiment (e.g. a list of differentially expressed genes). Paintomics 3.0 is meant to work with *log-scale* quantification values where positive values indicate over-expression or an increased presence of the features and negative values indicate repression or reduced presence, regarding a reference or control condition.

**Table 1A** shows an example of a quantification file for categories (1) and (2): first column must contain the feature name or identifier. As a general rule Paintomics accepts Entrez Gene IDs as feature identifiers, although for some species other identifier/name domains are supported (see below Identifier and name conversion). Remaining columns contains the quantification values for each sample in the experiment, preferably in logarithmic scale. **Table 1B** shows an example of a relevant features file for categories (i) and (ii): an unique column containing the identifiers or names for all significant features in the experiment.

<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="paintomics_input_figure1.png"/>
    <p class="imageLegend"><b>Table 1. Example for input for a gene-based "omic" type.</b> Quantification file (A) contains the gene name (first column) followed by the quantification values for 3 different time-points, in logarithmic scale. Differentially expressed genes are provided as a list (B).</p>
</div>

The format for input files for category (3) is slightly different due to in this case the features are genomic regions. For this category, Paintomics uses a modification of the BED format in which the first 3 columns indicate the name of the chromosome or scaffold, the start position of the feature in standard chromosomal coordinates (i.e. first base is 0) and the end position of the feature in standard chromosomal coordinates, respectively. The remaining columns contains the quantification values for each sample in the experiment, again, in logarithmic scale (Table 2A). Following this idea, the file with relevant features for this category (i) should contain 3 columns, corresponding to the chromosome, the start and the end position (Table 2B).

<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="paintomics_input_figure2.png"/>
    <p class="imageLegend"><b>Table 2. Example for input for a region-based "omic" type.</b> Quantification file (A) contains the chromosome number, start and end positions (first, second and third columns, resp.) for each region, followed by the quantification values for 3 different time-points, in logarithmic scale. Relevant regions are provided as a list of genomic coordinates (B).</p>
</div>

#Identifier and name conversion

The lack of standard naming conventions for the biological entities is a typical hurdle when trying to integrate or extract information from multiple data sources [Mohammad2012]. Although exist some efforts to move to an non-redundant standardized naming domain [Laibe2007], most of the databases and resources are independent of each other and assign custom naming conventions to the biological entities. For example, while some of the major public databases such as GenBank [Benson2012], NCBI RefSeq [Maglott2000] or UniProt [Bateman2015] organized the stored data based on accession numbers, other resources make use of use organism-specific naming conventions (e.g. the Gene Ontology database [Blake2012]) or numerical codes (Entrez database [Maglott2011]). KEGG database uses different gene name conventions for each specie, generated from publicly available resources, mostly NCBI RefSeq and GenBank. Consequently, Paintomics incorporates a Name/ID converter tool in order to extend the scope of the application, allowing users to input their data regardless of the used naming domain.

<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="paintomics_input_figure3.png"/>
    <p class="imageLegend"><b>Figure 1. Identifier/name conversion in Paintomics 3.0</b></p>
</div>

In a few words, the implemented system fetches the translation information from public databases such as Ensembl, PDB, NCBI RefSeq and KEGG, processes the downloaded files, generates the translation tables and stores them in MongoDB collections. The central pillar for translation process are the transcripts. For example, given a feature ID (gene, protein or transcript) for database A, that we want to translated to a valid gene name for database B. First the system retrieves the list of transcripts associated to the feature (if any). Then, for each transcript ID in database A, it searches for the equivalent transcript identifier for database B. Finally, as we requested the gene name, the system finds the gene name associated for each found transcript (**Figure 1**).

Although this method has some limitations, mainly due to the intersection between databases is not complete (which means that some biological entities on database A could not exist on database B), in general terms the percentage of translated features is good and enough to work properly with Paintomics. Alternatively, users can translate their data using third-party tools and input them conveniently adapted to the corresponding KEGG name domain for the studied organism.

In both cases, Paintomics processes the input and presents to the user some statistics summarizing the distribution for the data for each omic data type as well as the percentage of translated features to valid KEGG feature names, if proceeds, as shown in **Figure 2**.

<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="paintomics_input_figure4.png"/>
    <p class="imageLegend"><b>Figure 2. Results for ID/name conversion step in Paintomics 3.0</b>. For each input data type, an interactive chart indicating the percentage of translated feature is shown. Additional statistics about data distribution are also reported. Results can be downloaded as text files.</p>
</div>

#Matching Regions to Genes, RGMatch

Omics approaches for studying regulatory aspects of gene expression such as ChIP-seq, DNase-seq, ATAC-seq or Methyl-seq, typically return potentially functional regions, defined by genomic coordinates, which must then be related to proximal genes in order to gain any biological meaning. Therefore, integration of those region-based "omics" requires an extra step where regions are associated with genes based on their relative position with respect specific areas of the gene (i.e. the promoter region, the first exon, intronic areas, etc.).  For example, in a ChIP-seq experiment, the predicted transcription factor binding sites are generally expected to be located in the transcription start site (TSS) or promoter regions of the gene that is being regulated (**Figure 3A**).

To achieve this objective, Paintomics 3.0 incorporates **RGmatch** [[Furio2015]](https://bitbucket.org/pfurio/rgmatch), a rule-based and highly configurable method for computing region-gene associations, annotating each association with the area of the gene where the region overlaps. 
As **RGmatch** was developed as a command-line algorithm, Paintomics 3.0 provides a web interface to run the tool, fully integrated within the application workflow (**Figure 3B**).

<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="paintomics_input_figure5.png"/>
    <p class="imageLegend"><b>Figure 3. RGMatch in Paintomics 3.0</b>. Figure A shows associations between genes and ChIP-seq regions, valid regions should match to the transcription start site (TSS) or promoter regions of the gene (area of interest). Figure B shows the input web form for RGMatch.</p>
</div>
