PCA.GENES<-function(X)
{
#PCA.GENES is very useful to obtain principal components to a matrix that has more variables than individuals. 
#R can not apply princomp is such case and when there are a lot of variables eigen(t(X)%*%X) can not be computed.

#X is a matrix that has on columns the genes considered as variables in the PCA analysis.
#First we center the matrix by columns (Xoff) and then we obtain the eigenvalues and the eigenvectors of the matrix Xoff%*%t(Xoff) and we #use the equivalences between the loadings and scores to obtain the solution
#Llamo scores1 y loadings1 a lo que busco y scores2 y loadings2 a los scores y loadings de la traspuesta

X <- as.matrix(X)
n<-ncol(X)
p<-nrow(X)
offset<-apply(X,2,mean)
Xoff<-X-(cbind(matrix(1,p,1))%*%rbind(offset))

#eigen command sorts the eigenvalues in decreasing orden.

eigen<-eigen(Xoff%*%t(Xoff)/(p-1))
var<-cbind(eigen$values/sum(eigen$values),cumsum(eigen$values/sum(eigen$values)))

loadings2<-eigen$vectors
scores2<-t(Xoff)%*%loadings2

normas2<-sqrt(apply(scores2^2,2,sum))

scores1<-loadings2%*%diag(normas2)
loadings1<-scores2%*%diag(1/normas2)

output<-list(eigen,var,scores1,loadings1, Xoff)
names(output)<-c("eigen","var.exp","scores","loadings", "Xoff")
output
}