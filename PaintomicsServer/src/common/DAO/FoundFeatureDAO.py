from .DAO import DAO
from .FeatureDAO import FeatureDAO
from src.classes.Feature import Feature

class FoundFeatureDAO(FeatureDAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(FoundFeatureDAO, self).__init__(*args, **kwargs)
        self.collectionName = "foundFeaturesCollection"