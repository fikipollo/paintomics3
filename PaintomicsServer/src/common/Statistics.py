from math import log
from scipy.stats import chisqprob, fisher_exact
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
    foundNoSig = foundElems - foundSignificative
    notFoundSig = totalSignificative - foundSignificative
    notFoundNoSig = (totalElems - foundElems) - notFoundSig

    #___________| DE | Not DE |
    #     Found |    |        |
    # Not Found |    |        |
    #TODO: WHY RIGHT TAIL?
    p = fisher_exact([[foundSignificative, foundNoSig],[notFoundSig, notFoundNoSig]], 'greater')[1]
    return p

def calculateCombinedFisher(significanceValuesList):
    #X^2_2k ~ -2 * sum(ln(p_i))


    accumulatedValue = 0
    for significanceValues in significanceValuesList:
        accumulatedValue += log(significanceValues[2])

    accumulatedValue = accumulatedValue * -2

    return(chisqprob(accumulatedValue, 2*len(significanceValuesList)))
