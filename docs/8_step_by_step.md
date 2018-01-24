<div class="imageContainer" style="" >
    <img src="paintomics_150x690.png" title="Paintomics LOGO." style=" height: 70px !important; margin-bottom: 20px; ">
</div>

# Introduction

The following document will guide you through the required steps to perform a basic analysis in Paintomics. In a nutshell, each process has 3 major steps:

1. Upload your data.
2. Review initial matching results and configure metabolite assignment, if required.
3. Visualization of final results.

However, before starting to use the application you must choose between starting an anonymous session or continuing with an user account, which provides many benefits, <a target="_blank" href="http://paintomics.readthedocs.io/en/latest/2_2_cloud_drive/">read more about them</a>.


# Step 1: upload data

The main page shows a data uploading form with 2 sections. In the first one a combobox (**Figure 1.A**) is provided to allow you to select the organism from an alphabetically ordered list, supporting partial filtering by writing in it. If the species is not present you can use the link to request it and we will install it as soon as possible.

The second section contains two parts. In the right one (**Figure 1.B**) you can enter the input data for each omic to include in the analysis. For doing so the "Browse" button opens a menu with 3 options:

1. **Upload file from my PC**: conventional approach to select the file from your computer.
2. **Use a file from 'My data'**: only available for registered users. Read more at <a href="http://paintomics.readthedocs.io/en/latest/2_2_cloud_drive/" target="_blank">Cloud Drive</a> section.
3. **Clear selection**: reset the selected file, if any.

By default "Gene expression" and "Metabolomics" omics are provided, but in the left side (**Figure 1.C**) you can add more by clicking the <img src="addicon.png" style="vertical-align: middle; height: 24px;margin:0;"/> icon; in a similar way, the <img src="removeicon.png"  style="vertical-align: middle; height: 24px;margin: 0;"/> icon allows to undo the action. You can add more than one omic of the same type, provided they have different names. Some options are simple shortcuts with predefined names (like "Proteomics") and will disappear from the list after adding them, unlike the generic ones (like Region based omic).

For more information about the configuration options of regulatory and region based omic, read the associated pages in the "Supporting tools" at the left menu of the main Paintomics webpage.

You can read more about the accepted input data in the <a href="http://paintomics.readthedocs.io/en/latest/2_1_accepted_input/" target="_blank">dedicated page</a>, as well as download the example data <a href="http://bioinfo.cipf.es/paintomics/resources/paintomics_example_data.zip">here</a>.

Once everything is ready, press the button "Run paintomics" in the upper left corner.

<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="paintomics_input_figure1.png"/>
    <p class="imageLegend"><b>Figure 1. Input data form.</b> Organism selection (A). Input data for chosen omics (B). Available omics panel (C).</p>
</div>

# Step 2: matching summaries and metabolite assignment

Paintomics processes your files and offers you different plots showing the results of matching the identifiers of your files to the KEGG ids (read more <a href="http://paintomics.readthedocs.io/en/latest/2_1_accepted_input/#identifier-and-name-conversion" target="_blank">here</a>). You can also view diverse information of your data by hovering the data distribution plot with the mouse cursor (**Figure 2**).

<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="step2_up.png"/>
    <p class="imageLegend"><b>Figure 2. Mapping results and data distribution plots for each omic.</b></p>
</div><br />

If a compound based omic like metabolomics was provided, an additional section will be available below the previous plots (**Figure 3**) to review the assignment and correct it if you consider it. Each compound found in your data will show many checkboxes with the candidates.

<br />

<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="step2_down.png"/>
    <p class="imageLegend"><b>Figure 3. Compound disambiguation.</b></p>
</div><br /><br />

When you are satisfied with the settings, click "Next step" button.

# Step 3: visualizing the results

In the final step Paintomics displays the obtained results offering many configuration options for tweaking the visualization of them.

### Pathways summary

This panel shows you the job ID as well as the link you must use to access it. You can also view the number of found pathways and the ones that are significant (p-value lower than 0.05). These counters will be automatically updated based on your filtering options and p-value selection, using by default the Fisher combined method in cases with more than one omic.


<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="pathway_summary.png"/>
    <p class="imageLegend"><b>Figure 4. Summary panel showing the job ID as well as the found pathways.</b></p>
</div>

### Pathways classification

Each KEGG pathway is associated to a primary category and subcategory (see more <a href="http://paintomics.readthedocs.io/en/latest/4_2_kegg_categories/" target="_blank">here</a>). In this panel you can access that information by expanding the elements of the tree, with options to show or hide individual nodes or entire branches by clicking on the checkboxes or the links that appear when hovering over the options, then the "Apply" button.


<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="pathway_classification.png"/>
    <p class="imageLegend"><b>Figure 5. Classification of each KEGG pathway with filtering options.</b></p>
</div>

### Pathways network

The pathway interaction network is built according to the process described in <a href="http://paintomics.readthedocs.io/en/latest/4_3_pathways_network/" target="_blank">this page</a>, in which a more detailed explanation is given.

<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="pathway_network.png"/>
    <p class="imageLegend"><b>Figure 6. Pathway interaction network.</b></p>
</div>

### Pathway enrichment

In the pathway enrichment table you can see every pathway that had at least one match with your data, as explained <a href="http://paintomics.readthedocs.io/en/latest/4_1_pathway_enrichment/" target="_blank">in this page</a>.

The header of the table has some filtering options to quickly search through the table. Note that this "live search" is not permanent, will not be saved and will not affect the number of found & significant pathways, unlike filtering by category as explained in the classification panel section.

The visible columns can be individually adjusted by hovering the column block (i.e. "Significance tests"), then clicking at the arrow that will appear on the right side. Depending on the job there can also be some additional selectboxes to change the method for adjusted p-values or the method for combined p-values; in the last case, selecting 'Stouffer' has method will enable the configure button allowing to use custom weights for the calculation.

Clicking on the paint column icon (<img src="paintpathways.png"  style="vertical-align: middle; height: 24px;margin: 0;"/>) will load the detailed pathway view.


<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="pathway_enrichment.png"/>
    <p class="imageLegend"><b>Figure 7. Pathway enrichment table.</b></p>
</div>

## Detailed pathway view

The main component of the detailed pathway view is the KEGG diagram showing all the nodes and relationships between them.

Matches are represented by boxes painted over those nodes, containing a heatmap with the record values. One box can have more than one gene or feature associated to it, symbolized by a plus icon. If at least one of these features is significant, a star symbol will also be visible.

Placing the cursor over these boxes will open up a tooltip window expanding the info. If multiple features are associated to it, a "Prev/Next" links will appear in the lower part of that window allowing to iterate overt them.



<div class="imageContainer" style="box-shadow: 0px 0px 20px #D0D0D0; text-align:center; font-size:10px; color:#898989" >
    <img src="pathway_detailed.png"/>
    <p class="imageLegend"><b>Figure 7. Detailed pathway view.</b></p>
</div>


<br/>
For any question on Paintomics, users can send a mail to [paintomics@cipf.es](mailto:paintomics@cipf.es).