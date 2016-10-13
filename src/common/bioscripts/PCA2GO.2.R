##############################################################
# This functions performs PCA and selects scores for genes
# associated by belonging to a GO, given a selection of GOs
# It prodices a matrix X.sel with columns the number of
# conditions and rows the number of GO_genes
# 
# Input data
# X: expression data matrix
# selection: GO selection object obtained by select.GO
# fac.sel = criterion to select components, con be:
# 	%accum = percentage of accumulated variability
#	single% = percentage of variability of that PC
#	abs.val = absolute value of the variabily of that PC
#	rel.abs = fold variability of tot.var/rank(X)
# var.cutoff = variability cut off value
#
# Ana Conesa aconesa@cipf.es 8 September 2007
############################################################


PCA2GO.2 <- function (X, annotation, var.cutoff = 2, fac.sel = "rel.abs")
{
fac.sel <- match.arg(fac.sel, c("%accum", "single%", "abs.val", "rel.abs"))
# initialize variables
X.sel <- NULL 
n.go <- NULL
total.genes <- NULL
variab <- vector (mode="numeric")
tot.variab <- vector (mode="numeric")
eigen.val <- NULL
go.sel <- unique(annotation[,2])
n.ge <- NULL
X.loadings <- vector(mode = "list", length = 0)
# PCAs for all GOs loop
   for (i in 1: length(go.sel)) {
	gene.sel <- annotation[annotation[,2] == go.sel[i],1]
        if (length(gene.sel) > 1) {
      total.genes <- unique(c(total.genes, gene.sel))
      gene.sel <- is.element(rownames(X), gene.sel)
      if (length(which(gene.sel)) > 1) {
         gene.sel <- X[gene.sel,]
         if (any(is.na(gene.sel))) { gene.sel <- pca4NA(gene.sel)}
		pca.sel <- PCA.GENES(t(gene.sel))  # pca
		eigen <- pca.sel$eigen$values
		tot.var <- sum(eigen)
		eigen.val <- c(eigen.val, tot.var)
		rank <- length(which(eigen > 1e-16))
		level <- 1
		# num fac
      	if (fac.sel == "%accum") {
			fac <- max(length(which(pca.sel$var.exp[,2] <= var.cutoff / sqrt(level))),1)
		} else if (fac.sel == "single%"){
      		fac <- length(which(pca.sel$var.exp[,1] >= (var.cutoff / sqrt(level))))
		} else if (fac.sel == "rel.abs"){
			mean.expl.var <- tot.var/ nrow(gene.sel)
			fac <- length(which(eigen >= (mean.expl.var*var.cutoff / sqrt(level))))
		} else if (fac.sel == "abs.val"){
			abs.val.bycomp <- mean(apply(pca.sel$Xoff,2,var)) * nrow(gene.sel)
			fac <- length(which(eigen >= abs.val.bycomp * var.cutoff / sqrt(level)))
		}
		tot.variab <- c(tot.variab, pca.sel$var.exp[,1])
		#variab <- c(variab, pca.sel$var.exp[1:fac,1])
		if (fac > 0 ) { # num fac
		
            	variab <- c(variab, pca.sel$var.exp[1:fac,1])
            	n.ge <- c(n.ge, nrow(gene.sel))
      		n.go <- c(n.go, fac)
      		data.h <- as.matrix(pca.sel$scores[,1:fac])
                loads <-  as.matrix(pca.sel$loadings[, 1:fac])
		colnames(data.h) <- paste(go.sel[i], c(1:fac), sep="_")
      		X.sel <- cbind(X.sel,data.h) # attach to results matrix
                for (u in 1:fac)  { X.loadings[[length(X.loadings)+1]] <- loads[,u] }
               	}
            }
	}
   }
# Rearrange result
rownames(X.sel) <- colnames(X)
names(X.loadings) <- colnames(X.sel)
X.sel <- t(X.sel)
return(list("X.sel" = X.sel, "X.loadings" = X.loadings,"n.ge" = n.ge,"n.go" = n.go, "go.sel" = go.sel, "total.genes" = total.genes, "var.cutoff" = var.cutoff, "variab" = variab, "tot.variab" = tot.variab, "eigen.val" = eigen.val))
}

