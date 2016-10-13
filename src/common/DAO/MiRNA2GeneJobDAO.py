#***************************************************************
#  This file is part of PaintOmics 3
#
#  PaintOmics 3 is free software: you can redistribute it and/or
#  modify it under the terms of the GNU General Public License as
#  published by the Free Software Foundation, either version 3 of
#  the License, or (at your option) any later version.
#
#  PaintOmics 3 is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with PaintOmics 3.  If not, see <http://www.gnu.org/licenses/>.
#  Contributors:
#     Rafael Hernandez de Diego <paintomics@cipf.es>
#     Ana Conesa Cegarra
#     and others
#
#  More info http://bioinfo.cipf.es/paintomics
#  Technical contact paintomics@cipf.es
#
#**************************************************************

from src.common.DAO.DAO import DAO

class MiRNA2GeneJobDAO(DAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(MiRNA2GeneJobDAO, self).__init__(*args, **kwargs)
        self.collectionName = "jobInstanceCollection"

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def insert(self, instance, otherParams=None):
        jobInstance=instance
        collection = self.dbManager.getCollection(self.collectionName)
        instanceBSON = jobInstance.toBSON(recursive= False)

        instanceBSON["jobType"] = "MiRNA2GeneJob"

        collection.insert(instanceBSON)

        return True

    #******************************************************************************************************************
    # DELETE INSTANCES
    #******************************************************************************************************************
    def remove(self, id, otherParams=None):
        if(otherParams == None or not otherParams.has_key("userID")):
            return False
        collection = self.dbManager.getCollection(self.collectionName)

        collection.remove({"jobId": id, "userID" : otherParams.get("userID")})

        return True
