#!/usr/bin/Rscript

## Collect arguments   -----------------------------------------------------------------------------------------------
args <- commandArgs(T)

## Default setting when no arguments passed --------------------------------------------------------------------------
if(length(args) < 5) {
  args <- c("--help")
}

## Help section
if("--help" %in% args) {
  cat('
      The R Script
 
      Arguments:
      --specie=someValue       - character, specie code e.g. mmu
      --input_file=someValue   - character, name for the input file
      --ouput_prefix=someValue - character, prefix for all output files
      --data_dir=someValue     - character, directory where saving temporal and output files 
      --kegg_dir=someValue     - character, location for KEGG data
      --sources_dir=someValue  - character, location for other R scritps
      --cutoff=someValue       - numerical, cutoff for the PCA Function (optional, default 0.3)
      --cluster=someValue      - character, clustering method (kmeans or hierarchical),  (optional, default hierarchical)
      --kclusters=someValue    - numerical, number of clusters for K-means (optional, default calculated dinamically)

      --help                 - print this text
 
      Example:
      ./generateMetaGenes.R --specie="mmu" --input_file="Gene expression_matched.txt" --output_prefix="gene_expression" --data_dir="/home/rhernandez/Desktop/caca/test/" --kegg_dir="/data/KEGG_DATA/ --sources_dir="/home/rhernandez/Desktop/workspace/paintomics/PaintomicsServer/src/common/bioscripts/"\n\n')
  
  q(save="no")
}

## Parse arguments (we expect the form --arg=value)
cat("generateMetaGenes.R - STEP 1. Parse arguments, ")
parseArgs <- function(x) strsplit(sub("^--", "", gsub("\"", "", x)), "=")
argsDF <- as.data.frame(do.call("rbind", parseArgs(args)), stringsAsFactors=F)
argsL <- as.list(as.character(argsDF$V2))
names(argsL) <- argsDF$V1
args <- as.data.frame(argsL, stringsAsFactors=F)

# args <- data.frame(specie="mmu", input_file="Gene expression_matched.txt", output_prefix="caca", data_dir="/home/rhernandez/Desktop/caca/test", kegg_dir="/data/KEGG_DATA/", sources_dir="/var/www/paintomics/src/common/bioscripts/", stringsAsFactors = F, cluster="hierarchical")

## cutoff default
if(is.null(args$cutoff)) {
  # use mean(apply(data,1,var))*1.3  when B2GScore was not run
  args$cutoff <- 0.3
}
## cutoff default
if(is.null(args$cluster)) {
  args$cluster <- "kmeans"
}

args$kegg_dir <- paste(args$kegg_dir, "current/", args$specie, "/gene2pathway.list", sep="")


# LOAD DEPENDENCIES   --------------------------------------------------------------------------------------------
cat("STEP 2. Load dependencies, ")
setwd(args$sources_dir)
source("PCA2GO.2.R")
source("PCA-GENES.R")

# parameters for PCA on genes of a GO
PCA2GO.fun = "PCA2GO.2"  # change to PCA2GO.2 when  B2GScore was not run
sel = "single%"


#LOAD DATA    ---------------------------------------------------------------------------------------------------
cat("STEP 3. Load input data, ")
setwd(args$data_dir)
# Read the reference file
genes2pathway <- read.table(file=args$kegg_dir, header=FALSE, sep="\t", quote="", as.is=TRUE)
genes2pathway <-data.frame(lapply(genes2pathway, function(v) {
  if (is.character(v)) return(tolower(v))
  else return(v)
}))

# Read the input file
# Example 
# ENSMUSG00000034875	Nudt19	110959	0.0013615644203	-0.00727757835919	-0.015612884896	-0.0444182798681	-0.132208079869	-0.163256775828
input_data <- read.table(file=args$input_file, header=FALSE, quote="\t")
# Remove duplicates 
# TODO: now we are just ignoring the duplicates and taking the first match, maybe we should calculate mean?
input_data <- input_data[!duplicated(input_data$V3),]
# Adapt input data to a data.frame object 
input_data <- data.frame(input_data[,4:ncol(input_data)], row.names=paste(args$specie, ":", tolower(input_data[,3]), sep=""))

#genes2pathway[which(genes2pathway[,1] %in% rownames(input_data)),]
# GET METAGENES  ------------------------------------------------------------------------------------------------
cat("STEP 4. Obtaining metagenes, ")
expression_GO <- get(PCA2GO.fun)(input_data, genes2pathway, var.cutoff = args$cutoff, fac.sel =  sel)
metagenes <- expression_GO$X.sel


# ADJUST GENE DIRECTION -----------------------------------------------------------------------------------------
##for each metagene
for (i in 1:length(row.names(metagenes)) ) {
  cur_pathway_id <- unlist(lapply(strsplit(row.names(metagenes)[i], "_"), function(x) x[1]))
  #loadings indicates the contribution of each gene to PC1
  #The loading sign is not arbitrary. 
  #Positive loading indicates positive correlation of gene expression with the scores while negative loading indicates negative correlation.
  gene_loadings <- unlist(expression_GO$X.loadings[i])
  #select genes that contribute most in a given component as
  # abs(loading del gen)/sum(abs(loadings de todos los genes)
  nGenes <- length(gene_loadings)
  loadings_sum <- sum(abs(gene_loadings))
  has_positives<-0
  has_negatives<-0
  selected <- c()
  for(j in gene_loadings ){
    #If this value is greater than 1/total_genes, the gene is selected because it has a greater contribution 
    #than the value of contribution if all the same genes contribute together.
    if(abs(j)/loadings_sum > 1/nGenes){
      selected <- c(selected, j)    
      has_positives<- has_positives + ifelse(j > 0, 1, 0)
      has_negatives<- has_negatives + ifelse(j < 0, 1, 0)
    }
  }
  
  ## Change the direction for the metagene
  ##If most or all of the genes have a positive loading then
  if(has_positives > has_negatives ){
    #leave metagene as it is
  ##If most or all of the genes have a negative loading then invert metagene
  }else if(has_negatives > has_positives){
    metagenes[i,] <-metagenes[i,] * -1 
  ##If same number of negative and positive loadings then resolve
  }else if(has_negatives > 0 && has_positives > 0){
    has_positives <- sum(selected[selected>0])
    has_negatives <- abs(sum(selected[selected<0]))
    if(has_negatives > has_positives){
      ##If negative loadings genes are bigger then invert metagene
      metagenes[i,] <-metagenes[i,] * -1 
    }
  }
}

# CLUSTERIZE ----------------------------------------------------------------------------------------------------
data <- metagenes

if(is.null(args$kclusters)) {
  library(cluster)
  library(amap) 
  
  ## cutoff default
  #data <- scale(metagenes)

  # Compute pairwise distance matrices
  dist.res <- Dist(data, method = "pearson")
  k.max <- round(sqrt(length(row.names(data))/2)) + 1
  sil <- rep(0, k.max)

  if(args$cluster=="hierarchical"){
    # Compute the average silhouette width for k = 2 to k = maxK
    for(i in 2:k.max){
      # Hierarchical clustering results
      hc <- hclust(dist.res, method = "complete")
      hc.cut <- cutree(hc, k = i)
      ss <- silhouette(hc.cut, dist.res)
      sil[i] <- mean(ss[, 3])
    }
  }else{
    # Compute the average silhouette width for k = 2 to k = maxK
    for(i in 2:k.max){
      km.res <- kmeans(data, centers = i, iter.max = 20)
      ss <- silhouette(km.res$cluster, dist.res)
      sil[i] <- mean(ss[, 3])
    }
  }

  #args$kclusters <- which.max(sil)
  valid <- which(sil > 0.7)
  if(length(valid) == 0){
    valid <- which(sil > 0.6)
  }
  
  if(length(valid) == 0){
    args$kclusters <- which.max(sil)
  }else{
    args$kclusters <- max(valid)
  }
  
} else {
  args$kclusters = as.integer(args$kclusters)
}

if(args$cluster=="hierarchical"){
  hc <- hclust(dist.res, method = "complete")
  clusters <- cutree(hc, k = args$kclusters)
}else{
  clusters <- kmeans(data, centers = args$kclusters, iter.max = 20)
}




# GENERATE THE METAGENES IMAGES-----------------------------------------------------------------------------------
cat("STEP 5. Generate output files...\n")
prev_pathway_id <- ""

# function to find medoid in cluster i
clust.centroid = function(method, data, clusters, i) {
  if(method == 'hierarchical'){
    ind = (clusters == i)
    colMeans(data[ind,])
  }else{
    clusters$centers[i,]
  }
}

minMax <- range(data)
# GENERATE THE METAGENES IMAGES-----------------------------------------------------------------------------------
for (i in 1:args$kclusters){
  #GET THE PATHWAY IDS FOR CURRENT CLUSTER
  if(args$cluster=="hierarchical"){
    pathway_ids <- names(which(clusters==i))
  }else{
    pathway_ids <- names(clusters$cluster[clusters$cluster==i])
  }
  #GET THE VALUES FOR THESE PATHWAYS
  values <- data[pathway_ids,]
  #CREATE THE PNG
  png(paste(args$output_prefix, "_cluster_", i, ".png", sep=""), height = 150, width = 150)
  par(mai = rep(0, 4), mar = rep(0.8, 4))
  
  if(length(row.names(values)) > 1){
    #Plot first cluster
    plot(values[1,], type="l", col="gray88", main=paste(length(pathway_ids), "metagenes"), ylim=minMax, axes=F, xlab=NULL)
    #Plot remaining clusters (if any)
    for (n in 2:length(row.names(values)) ) {
      lines(values[n,], type="l", col="gray88")
    }
  }else{
    plot(values, type="l", col="gray88", main=paste(length(pathway_ids), "metagenes"), ylim=minMax, axes=F, xlab=NULL)
  }
  #Plot centroid
  lines(clust.centroid(args$cluster, data, clusters, i), type="l", col="red", lwd=2)
  abline(h =0)
  box()
  
  dev.off()
}

#Add cluster info to table
metagenes <- as.data.frame(metagenes)
for (i in 1:args$kclusters){
  #GET THE PATHWAY IDS FOR CURRENT CLUSTER
  if(args$cluster=="hierarchical"){
    pathway_ids <- names(which(clusters==i))
  }else{
    pathway_ids <- names(clusters$cluster[clusters$cluster==i])
  }
  metagenes[pathway_ids, "cluster"] <- i
}
#Update the name for the rows
rownames(metagenes) <- gsub("_", "\t", gsub("path:", "", rownames(metagenes)))

#Save table to file
write.table(metagenes[, c(ncol(metagenes), 1:(ncol(metagenes) - 1))], file=paste(args$output_prefix, "metagenes.tab", sep="_"), quote = FALSE, sep="\t", col.names = FALSE)



