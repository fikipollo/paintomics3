<div class="imageContainer" style="" >
    <img src="paintomics_150x690.png" title="Paintomics LOGO." style=" height: 70px !important; margin-bottom: 20px; ">
</div>


## Starting with PaintOmics
**Paintomics** is a web tool for the integrative visualization of multiple omic datasets onto KEGG pathways.To start working with PaintOmics, open your browser (Google Chrome or Firefox preferably) and access to the following URL: [**http://bioinfo.cipf.es/paintomics/**](http://bioinfo.cipf.es/paintomics/) First you need to create a new account, choose the option **"Sign up now"** and fill the form with your data; or choose **"Start Guest Session",** to start a new guest session (please note that all data submitted by Guest users will keep on the system a maximum of 7 days). **Do not forget your password!!**  Explore the different options at main menu (left side of the window).
## Preparing the data for PaintOmics
Paintomics supports lot of different omic data types, however there are few considerations before start working:
- -- **Files must contain** [**tab-separated values**](https://en.wikipedia.org/wiki/Tab-separated_values).
- -- **Values must indicate differential changes between conditions** , e.g. differential expression or any method that you prefer for your omics data, but always:
  - ooPositive values indicate enrichment (e.g. overexpression in transcriptomics)
  - ooNegative values indicate reduction  (e.g. underexpression in transcriptomics
 As an illustrative example let's adapt the following files which contain RNA-seq data and DNase-seq.
### Preparing RNA-SEQ Data
Download the **Gene expression file (RNAseq\_CQN.txt).**This file contains gene expression quantification values for a subset of mouse genes, conveniently normalized in logarithmic scale.The file has 37 columns, separated by spaces, where:
- --First column indicates the gene name (ENSEMBL gene ID)
- --One column for each combination **"Condition", "Time-point"** and **"Number of replicate"**
i.e. 2 conditions (Control, Ikaros) \* 6 time-points (0h, 2h, 6h, 12h, 18h , 24h) \* 3 replicates per time-point = **36 columns.**

|   | Batch\_1\_Ctr\_0H | Batch\_2\_Ctr\_0H | Batch\_4\_Ctr\_0H | ... | Batch\_4\_Ik\_24H |
| --- | --- | --- | --- | --- | --- |
| ENSMUSG00000000001 | 14.7979331510518 | 14.8111777579489 | 15.1276204852104 | ... | 15.32687675891 |
| --- | --- | --- | --- | --- | --- |
| ENSMUSG00000000085 | 14.2178933569466 | 14.1732521770369 | 13.803459283     | ... | 14.25783296098 |
| --- | --- | --- | --- | --- | --- |
| ENSMUSG00000000093 | 8.26609976827721 | 7.97380357952496 | 8.26059375800452 | ... | 11.27248432423 |
| --- | --- | --- | --- | --- | --- |

 Launch RStudio and create a new R script.

| **Question 1:** Write a new R script which process the previous file and calculate the differential expression between each pair Ikaros/Control, as follows:
1. 1Load the file content into a matrix
2. 2Calculate the **ratio** between each pair of values "Condition, Time-point and Replicate",
e.g. Batch\_1\_Ctr\_0H with Batch\_1\_Ik\_0H, Batch\_3\_Ctr\_2H with Batch\_3\_Ik\_2H, etc.

 ![](data:image/*;base64,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)

1. 3Calculate the mean ratio between replicates of the same time-point.
2. 4Save the results in a **tab-separated** values file

| GENE ID | 0H | 2H | 6h | 12h | 18h | 24h |
| --- | --- | --- | --- | --- | --- | --- |
| ENSMUSG00000000001 | 0.005179 | -0.00933 | 0.073007 | 0.0134159 | 0.077053 | 0.06322 |
| --- | --- | --- | --- | --- | --- | --- |

  |
| --- |
| setwd( **"THE/LOCATION/FOR/YOUR/FILES>"** )dir()  _# RNA-seq -----------------------------------------------------------------_ _# First read the file into a matrix object,_rnaseq <- read.delim(" **RNAseq\_CQN.txt"** ,header= **TRUE** ,row.names= **1** ,as.is= **TRUE** ,sep=" ")_# Shows the first 5 rows of the matrix_head(rnaseq)_#                     Batch\_1\_Ctr\_0H Batch\_2\_Ctr\_0H Batch\_4\_Ctr\_0H ... Batch\_3\_Ik\_24H Batch\_4\_Ik\_24H __# ENSMUSG00000000001    14.797933      14.811178      15.127620    ...  15.045891      15.326877__ # ENSMUSG00000000085    14.753266      14.288620      14.387110    ...  14.640788      14.257833__# ..._  _# For each row in the matrix, calculate the ratio for each pair_calculateRowRatios <- **function** (x){  log2(x[**19:36**]/x[**1:18**])} rnaseq <- t(apply(rnaseq, 1,calculateRowRatios))_# Shows the first 5 rows of the matrix_head(rnaseq)_#                     Batch\_1\_Ik\_0H   Batch\_2\_Ik\_0H ... Batch\_3\_Ik\_24H Batch\_4\_Ik\_24H__# ENSMUSG00000000001    0.028794952    0.02400306   ...  0.008396181     0.06754930 __# ENSMUSG00000000085   -0.005401374   -0.02385420   ...  0.058944368     0.03168674__ # ..._   _# Now, calculate the mean of the ratio between replicates at the same time-point_calculateReplicateRatiosMean <- **function** (x){  mean\_ratio\_0h  = mean(x[**1:3**]);  mean\_ratio\_2h  = mean(x[**4:6**]);  mean\_ratio\_6h  = mean(x[**7:9**]);  mean\_ratio\_12h = mean(x[**10:12**]);  mean\_ratio\_18h = mean(x[**13:15**]);  mean\_ratio\_24h = mean(x[**16:18**]);    c(mean\_ratio\_0h,mean\_ratio\_2h,mean\_ratio\_6h,mean\_ratio\_12h,mean\_ratio\_18h,mean\_ratio\_24h)} rnaseq <- t(apply(rnaseq, **1** , calculateReplicateRatiosMean))_#Shows the first 5 rows of the matrix_head(rnaseq)_#                         [,1]        [,2]        [,3]        [,4]        [,5]        [,6] __# ENSMUSG00000000001  0.015238853  0.01042930  0.04686596  0.01663972  0.04748804  0.04169198__ # ENSMUSG00000000085 -0.004242276  0.01897778  0.01382703  0.04848283  0.01746305  0.04254352__# ..._  _#Creates a valid header for the file_head <- c( **"# geneID"** ,paste( **"Ikaros/Control"** ,c( **"0h","2h","6h","12h","18h","24h"** ),sep= **"\_"** ))write(head,file= **"RNAseq\_CQN\_ratio.txt"** ,ncolumns=7, append= **FALSE** , sep="\t")  _# Finally, we save the matrix into a new file, but first we write the header for the file._write.table(rnaseq,file= **"RNAseq\_CQN\_ratio.txt"** ,append= **TRUE** ,row.names= **TRUE** ,col.names= **FALSE** ,quote= **FALSE** ,sep= **"\t"** ) |
| --- |


### Preparing DNASE-SEQ Data
Download the **DNAse-seq file (DNaseSeq.txt).**This file contains quantification values for a subset of DNAse-seq regions, conveniently normalized in logarithmic scale.The file has 37 columns, separated by tabs, where:
- -- **First column identifies the region** as follows: _Chromome\_start\_end_, where:
  - oo **Chromosome** indicates the Chromosome number
  - oo **Start** indicates the position of the first bp of the region in the genome
  - oo **End** indicates the position of the last bp of the region in the genome
e.g_. 1\_172490322\_172490824_
- --One column for each combination **"Condition", "Time-point"** and **"Number of replicate"**
i.e. 2 Conditions (Control, Ikaros) \* 6 time-points (0h, 2h, 6h, 12h, 18h , 24h) \* 3 replicates per time-point = **36 columns.**

|   | CT0h\_rep4 | CT0h\_rep5 | CT0h\_rep6 | ... | Ik24h\_rep6 |
| --- | --- | --- | --- | --- | --- |
| 1\_63176480\_63177113 | 5.12962526386568 | 5.1088729146623 | 4.600384750876 | ... | 5.09940603077 |
| --- | --- | --- | --- | --- | --- |
| 1\_172490322\_172490824 | 4.39879115152337 | 4.9089141017188 | 4.590721323302   | ... | 4.64766043572 |
| --- | --- | --- | --- | --- | --- |
| 1\_9748193\_9748790 | 6.22199423297263 | 5.7809293797892 | 5.215845275159 | ... | 5.97518719427 |
| --- | --- | --- | --- | --- | --- |

 Launch RStudio and create a new R script.

| **Question 2:** Write a R script which process the previous file and calculate the differential expression between each pair Ikaros/Control, as follows:
1. 1Load the file content into a matrix
2. 2Calculate the **ratio** between each pair of values "Condition, Time-point and Replicate",
e.g. CT0h\_rep4 with Ik0h\_rep4, CT2h\_rep5 with Ik2h\_rep5, etc.

 ![](data:image/*;base64,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)

1. 3Calculate the mean ratio between replicates of the same time-point.
2. 4Save the results in a tab-separated values files
**Note:** Separate region identifiers in 3 columns, _Chromosome_, _Start_ and _End_

| Chr | Start | End | 2H | 6h | 12h | 18h | 24h |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 63176480 | 63177113 | -3.04933 | -1.173007 | 0.0134159 | 3.077053 | 3.06322 |
| --- | --- | --- | --- | --- | --- | --- | --- |

  |
| --- |
| setwd("THE/LOCATION/FOR/YOUR/FILES>")dir() # DNase-seq ----------------------------------------------------------------- _# First read the file into a matrix object,_dnase <- read.delim(" **DNaseSeq.txt"** ,header= **TRUE** ,row.names= **1** ,as.is= **TRUE** ,sep=" ")_# Shows the first 5 rows of the matrix_head(dnase)_#                        CT0h\_rep4 CT0h\_rep5 CT0h\_rep6 ... Ik24h\_rep5 Ik24h\_rep6 __# 1\_63176480\_63177113     5.129625  5.108873  4.600385 ...   5.048141   5.099406__ # 1\_172490322\_172490824   4.398791  4.908914  4.590721 ...   4.220556   4.647660_ _# ..._  _# For each row in the matrix, calculate the ratio for each pair_dnase\_aux <- t(apply(dnase, **1** , calculateRowRatios))_# RETURNS A WARNING MESSAGE!!__# There were 50 or more warnings (use warnings() to see the first 50)__warnings() __#Warning messages:__ # 1: In FUN(newX[, i], ...) : NaNs produced__# ..._ _# Find out the problem... negative values? log(x) is undefined for x ≤ 0_min(dnase) _#[1] -0.8432541_ _# Add 1 to all values in the matrix, i.e. shift to positive values_dnase <- dnase+ **1** min(dnase) _#[1] 0.1567459_  _# For each row in the matrix, calculate the ratio for each pair_dnase\_aux <- t(apply(dnase, **1** , calculateRowRatios))_# Now, calculate the mean of the ratio between replicates at the same time-point_dnase <- t(apply(dnase , **1** , calculateReplicateRatiosMean))head(dnase)_#                               [,1]         [,2]        [,3]          [,4]         [,5]         [,6]__#1\_63176480\_63177113    0.0248946623 -0.046378716 -0.02914379 -0.0569667348 -0.061835562 -0.047533696 __#1\_172490322\_172490824 -0.1491362382 -0.032585223 -0.07455459 -0.0248728515 -0.020019872 -0.039175981_  _# Replace "\_" by tabs "\t" at the row names__ # i.e. separate into 3 columns (Chromosome, Start, End)__# e.g. 1\_63176480\_63177113 -> 1\t63176480\t63177113_rownames(dnase) <- gsub( **"\_"** , **"\t"** , rownames(dnase))  _#Creates a valid header for the file_head <- c( **"# Chr", "Start", "End"** ,paste( **"Ikaros/Control"** ,c( **"0h","2h","6h","12h","18h","24h"** ),sep= **"\_"** ))write(head, file= **"DNAseSeq\_ratio.txt"** , ncolumns=10, append= **FALSE** , sep="\t")  _# Finally, we save the matrix into a new file, but first we write the header for the file._write.table(dnase,file= **"DNAseSeq\_ratio.txt"** ,append= **TRUE** ,row.names= **TRUE** ,col.names= **FALSE** ,quote= **FALSE** ,sep= **"\t"** ) |
| --- |

## Loading the data in PaintOmics
For a real experiment, it would be necessary to prepare the files for the remaining omic data types; however, as this is just an illustrative example, we already did it for you ;)Return to the PaintOmics site and choose the option _"_ **Load example"** at the buttons toolbar (upper-right corner). This option automatically fills the submission form with the prepared files. We are now ready to **"Run Paintomics"**.
## Feature ID/Name conversion
A typical problem when working in bioinformatics is the conversion between different domains of names or ids of genomic features (genes, proteins, etc.).In order to minimize the efforts when adapting the input for Paintomics, version 3.0 includes a powerful Name/ID converter that translates automatically, when possible, our data into the appropriate name domain, i.e. the accepted set of feature ids for the current organism in KEGG.
### Mapping Regions to Genes
As the example files include some DNAse-seq regions, the first step in the process includes matching the genomic regions to the corresponding genes (closest gene) by using the tool _RGMatch_, included into Paintomics 3.0.By default, _RGMatch_ will report any region that overlaps to any gene area (Upstream, Promoter, TSS, etc.), however, Paintomics 3.0 extends this idea so we can easily discriminate those regions that overlap areas of interest of the gene._E.g. Given the following DNAse-seq regions that overlap different areas of a gene, if we are interested only in those regions that match at the Promoter and TSS areas of the gene, Paintomics will calculate a value of quantification for that gene as the mean of the quantification of all regions that overlap the desired areas, i.e. the mean of the quantification for Region 1, Region 2 and Region 3_. Feature Name/Ids translationAfter regions translation, PaintOmics will start with ID conversion.For the example files, we are working with Ensembl gene IDs for Mus Musculus (Gene Expression, DNase-seq and miRNA-seq), Gene Symbols (Proteomics) and default metabolite names (Metabolomics), while, by default, KEGG information for Mouse uses Entrez Gene ID, therefore, it's necessary a translation.

| Input name/id | Translated id |
| --- | --- |
| Mob4 | 19070 |
| --- | --- |
| Nedd8 | 18002 |
| --- | --- |
| ENSMUSG00000034875 | 110959 |
| --- | --- |
| ENSMUSG00000079553 | 100502766 |
| --- | --- |
| Alanine | Multiple candidatesAlanine, D-Alanine, L-Alanine, beta-Alanine |
| --- | --- |
| Citric acid | Citric acid |
| --- | --- |
| Glucose | Multiple candidatesD-Glucose, Glucose, alpha-D-Glucose, beta-D-Glucose |
| --- | --- |

 Adapting features ids to the corresponding domain it's a pretty heavy task which requires some seconds for processing (increases with the number of provided features).Be patient! Evaluate translationFor each omic data type, Paintomics will generate a plot summarizing the results for ID conversion as well as an overview for data distribution.Note that translation results can be downloaded as text files.

| **Question 3:** Download the results for ID/name translation and evaluate the results.Observe that some features were not translated, Why is that?Observe the data distribution boxplot, What is meaning for this chart? |
| --- |
| _Sometimes there is not a direct translation between two different name/id domains. __Taking as example Ensembl and RefSeq, some genes and transcripts  in ENSEMBL for Mus Musculus are do not exist or are not accepted yet by RefSeq. The main reason is that RefSeq is a collection of non-redundant, curated mRNA models, whereas Ensembl is a database containing gene models from multiple sources, in some cases resulting from automatic annotation.__ In other cases the lack of translation can be caused by a misspelled name/id or because Paintomics's databases are not up-to-date [in that case, a feedback mail will be appreciated_ ;) _]._ _About boxplots, moving the mouse cursor over the plot, we will see the following box containing a summary for data distribution._ _This information helps us to understand the distribution of our data and allows us to identify possible outliers and other problems._ _This is also important for in next steps, as some features are based on this distribution, e.g. By default, Paintomics uses the range [Percentile 10, Percentile 90] to calculate the min and max colors for the heatmaps, avoiding thus incorrect coloring due to the presence of outliers._ |
| --- |


## Pathways enrichment analysis
Following to the Gene/ID translation, Paintomics finds out the list of pathways for the selected specie that contains at least one or more features (genes or metabolites) from the input. Additionally, Paintomics weights the importance of each pathway by applying an enrichment analysis based on the number of input features involved in the biological process. As result of the previous process, Paintomics will generate a table containing all found Pathways, ranked by Combined p-value, i.e. the first positions in the table corresponds to those pathways with a higher significance value (lower p-value), while less significant pathways were located at the last positions of the table. In addition to the previous table, Paintomics generates an interactive network which shows the relationships between found pathways.Some keys to interpret this network are the following:
- **** Nodes are colored by KEGG Pathway classification (more info. [http://www.genome.jp/kegg/pathway.html](http://www.genome.jp/kegg/pathway.html))
- **** Node size is directly related with the pathway significance, i.e. the higher significance, the bigger will be the node.
- **** An edges between 2 nodes, indicates that the pathways have some features in common (genes and compounds). By default, Paintomics only draws edges when both pathways share at least a 10% of the features.
- **** Node position is dynamically calculated, taken in account the shared features between pathways, i.e. pathways that share lot of features, tend to situate closer, creating "cluster" of related pathways.


| **Question 4:** Observe the results (pathways table and the network) and use Network configurator to filter out all _Human Diseases_ pathways. Manipulate the network using the available tools and observe the changes.Use the _Search_ tool at the pathways table to find the **Cell Cycle** pathway and paint the pathway using the tool **Paint****.** |
| --- |


## Browsing the pathway
As final step in the process, we can explore each pathway separately and visualize our input data integrated at the KEGG diagram.The first time we open a Pathway for exploring, Paintomics shows 2 panels:
- **** The **interactive KEGG diagram**. At each matched feature (significant or not), a box is drawn with as many sections as columns present in the input files, each section colored according to its corresponding expression or concentration value at each particular sample. You can move, zoom and inspect the information contained in the pathway.
- **** An **auxiliary panel** showing some interesting information and a Search bar which allows us to locate quickly features involved on the current pathway.


| **Question 5:** Using the _Search tool_, find the gene **Cdkn1b** and observe the information.During the IGV exercises we observe the DNAse-seq and Gene Expression data for this gene. Is the information shown by Paintomics consistent with what we observed during the previous exercise? Do we get new information using Paintomics?? |
| --- |
| _Using IGV we observed that the gene expression for Cdkn1b increased a lot between time-point 0h and time-point 24h, while DNAse-seq data decreased. However we did not have any information about intermediate time-points, and we cannot elucidate the reason for the decreasing values of DNAse-seq._ _Using PaintOmics we observer the same behavior for data, but we get also information for the remaining time-points (2h, 6h, 12h and 18h)._ _Observing the trend for Gene Expression and DNAse-seq we could suspect that this gene was significantly regulated between 2 and 6 h after Ikaros induction, according to the observations of Ferreirós-Vidal et al __1__. That would explain the behavior for DNAse-seq and the high values of gene expression during later time-points._ |
| --- |

 Additionally, 2 interesting options are available at the upper toolbar.
- ****** Show heatmap**. This option opens a secondary panel where we can generate a heatmap for each omic data type present in the pathway.
- ****** Settings.** This option opens an auxiliary panel containing some configurations for data visualization.

| **Question 6:** Generate the heatmaps for this pathway changing the available options.Using the options at Settings panel, change the visualization and observe the differences. |
| --- |

 1 Ferreirós-Vidal I, Carroll T, Taylor B, et al **. Genome-wide identification of Ikaros targets elucidates its contribution to mouse B-cell lineage specification and pre-B-cell differentiation.** _Blood_ 2013;121(10):1769-1782 |
| --- |