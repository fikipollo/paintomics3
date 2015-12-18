##*******************************************************************************************
##****AUXLIAR FUNCTION DEFINITION************************************************************
##*******************************************************************************************
def calculateSignificance(test, totalFeatures, totalRelevantFeatures, totalFeaturesInPathway, totalRelevantFeaturesInPathway):
    if(test == "fisher"):
        return calculateFisher(totalFeatures, totalFeaturesInPathway, totalRelevantFeatures, totalRelevantFeaturesInPathway)
    else:
        raise NotImplementedError;

def calculateCombinedSignificancePvalue(combinedTest, significanceValuesList):
    if(combinedTest == "fisher-combined"):
        return calculateCombinedFisher(significanceValuesList)
    else:
        raise NotImplementedError;

def calculateFisher(totalElems, foundElems, totalSignificative, foundSignificative):
    import fisher

    foundNoSig = foundElems - foundSignificative
    notFoundSig = totalSignificative - foundSignificative
    notFoundNoSig = (totalElems - foundElems) - notFoundSig

    p = fisher.pvalue(foundSignificative, foundNoSig, notFoundSig, notFoundNoSig)

    return(p.right_tail)

def calculateCombinedFisher(significanceValuesList):
    #X^2_2k ~ -2 * sum(ln(p_i))
    from math import log
    from scipy.stats import chisqprob

    accumulatedValue = 0
    for significanceValues in significanceValuesList:
        accumulatedValue += log(significanceValues[2])

    accumulatedValue = accumulatedValue * -2

    return(chisqprob(accumulatedValue, 2*len(significanceValuesList)))
