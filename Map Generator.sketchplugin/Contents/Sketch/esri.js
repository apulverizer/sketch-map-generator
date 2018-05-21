@import "common.js";

function EsriMap () {}

EsriMap.prototype.service    = 'esri';
EsriMap.prototype.scaleLevels = [
  "100 - Room",
  "400 - Rooms",
  "800 - Small Building",
  "1250 - Building",
  "2500 - Buildings",
  "5000 - Street",
  "10000 - Streets",
  "20000 - Neighborhood",
  "40000 - Town",
  "80000 - City",
  "160000 - Cities",
  "320000 - Metro Area",
  "500000 - County",
  "750000 - Counties",
  "3000000 - State/Province",
  "6000000 - States/Provinces",
  "12000000 - Small Countries",
  "25000000 - Big Countries",
  "50000000 - Continent",
  "100000000 - World"
];
EsriMap.prototype.mapTypes   = [
  'Dark Gray Canvas',
  'Imagery',
  'Light Gray Canvas',
  'National Geographic',
  'Ocean',
  'Streets',
  'Terrain',
  'Topographic'
];

/**
 * Creates the Mapbox service provider.
 * @param  {Sketch context} context 
 */
EsriMap.prototype.create = function (context) {
  if (!checkCount(context)) {
    return;
  } else {
    if (!checkLayerType(context)) {
      return;
    } else {

      var viewElements = [];
      var dialog = this.buildDialog(context, viewElements);
      var settings = handleAlertResponse(dialog, viewElements, this.service, dialog.runModal());

      if (!checkSettings(settings, dialog)) {
        return;
      }

      var layer = context.selection[0];
      var position = getGeoCode(encodeURIComponent(settings.address));

      // Dictionary to map the user friendly name to the service folder/name
      var serviceLookup = {
        'Dark Gray Canvas': 'Canvas/World_Dark_Gray_Base',
        'Imagery': 'World_Imagery',
        'Light Gray Canvas': 'Canvas/World_Light_Gray_Base',
        'National Geographic': 'NatGeo_World_Map',
        'Ocean': 'Ocean/World_Ocean_Base',
        'Streets': 'World_Street_Map',
        'Terrain': 'World_Terrain_Base',
        'Topographic': 'World_Topo_Map'
      }
      
      // function to convert decimal degress to web mercator
      var degrees2meters = function(lat,lon) {
        var x = lon * 20037508.34 / 180;
        var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
        y = y * 20037508.34 / 180;
        return {
          y: y,
          x: x
        }
      }

      // Need to convert geocode result to web mercator projection
      // Seems like a bug in the Map Server at 10.3 where if you specify in bounding box
      // spatial reference, the scale property is not honored
      var position102100 = degrees2meters(position.lat, position.lon)

      // create the bounding box to submit to the service (lat/long + 1 meter)
      var boundingBox = position102100.x + "," + position102100.y + "," + (position102100.x+1) + "," + (position102100.y+1)

      // parse the scale
      var scale = settings.scale.split(" - ")[0]

      var width = layer.frame().width().toString()
      var height = layer.frame().height().toString()

      // Use the export map REST endpoint
      var imageUrl = 'https://services.arcgisonline.com/arcgis/rest/services/' + serviceLookup[settings.type] + '/MapServer/export?bbox=' + boundingBox + '&format=jpg&mapScale=' + scale + '&f=image&size=' + width + ',' + height
      log(imageUrl)
      fillLayerWithImage(imageUrl, layer, context);
    }
  }
};

/**
 * Builds the Esri window.
 * @param  {Sketch context} context      
 * @param  {Array} viewElements 
 * @return {COSAlertWindow}              
 */
EsriMap.prototype.buildDialog = function (context, viewElements) {
  var remember = getOption('remember', 0, this.service);
  var dialogWindow = COSAlertWindow.new();

  dialogWindow.setMessageText('Maps Generator (Esri)');
  dialogWindow.setInformativeText('Write an address and choose a scale option.');
  dialogWindow.addTextLabelWithValue('Enter an address or a place');
  dialogWindow.addTextFieldWithValue(remember == 0 ? '' : getOption('address', '', this.service));
  dialogWindow.addTextLabelWithValue(' ');
  dialogWindow.addTextLabelWithValue('Please choose a scale level');
  dialogWindow.addTextLabelWithValue('(A lower value increases the zoom level)');

  var scaleSelect = createSelect(this.scaleLevels, remember == 0 ? 8 : getOption('scale', 8, this.service));
  dialogWindow.addAccessoryView(scaleSelect);
  dialogWindow.addTextLabelWithValue(' ');
  dialogWindow.addTextLabelWithValue('You can choose a map type as well');

  var typeSelect = createSelect(this.mapTypes, remember == 0 ? 7 : getOption('type', 7, this.service), 200);
  dialogWindow.addAccessoryView(typeSelect);
  dialogWindow.addTextLabelWithValue(' ');

  var addressTextBox = dialogWindow.viewAtIndex(1);

  dialogWindow.alert().window().setInitialFirstResponder(addressTextBox);
  addressTextBox.setNextKeyView(scaleSelect);
  scaleSelect.setNextKeyView(typeSelect);

  var checkbox = createCheck('Remember my options', remember);
  dialogWindow.addAccessoryView(checkbox);

  dialogWindow.addButtonWithTitle('OK');
  dialogWindow.addButtonWithTitle('Cancel');

  dialogWindow.setIcon(NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("logo@2x.png").path()));

  viewElements.push({
    key: 'address',
    index: 1,
    type: 'input'
  });
  viewElements.push({
    key: 'scale',
    index: 5,
    type: 'select'
  });
  viewElements.push({
    key: 'type',
    index: 8,
    type: 'select'
  });
  viewElements.push({
    key: 'remember',
    index: 10,
    type: 'input'
  });

  return dialogWindow;
}