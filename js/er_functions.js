          var marks_bus = [], marks_sound = [], v_corredores = [], v_marks_corredor = [], coords_beep=[];
          var v_step_point=[], v_add_storage=[], v_add_points=[], v_paradas = [], v_provider_tpte = [];
          var v_paradasTimes=[];
          var infowindow = new google.maps.InfoWindow();
          var map, v_paradaCercana, blockedBUS=false;
          var timerBusDistances, polyline_parada;
          var zoom_level;

          const URL_CORREDORES = "proxy.php?url="+encodeURIComponent("http://api.ga.ulp.edu.ar/json/CorredorColeUrbana"),
                URL_GPS_BUS = "proxy.php?url="+encodeURIComponent("http://ga.ulp.edu.ar/openmapa/getInfoProxy.php?op=mCole"),
                URL_GPS_PLACES = "proxy.php?url="+encodeURIComponent("http://ga.ulp.edu.ar/openmapa/getInfoProxy.php?op=Calle&city=Todas"),
                URL_DISTANCE = "distance.php",
                KEY_HIST= 'historial', 
                KEY_HIST_ALERTS = 'point_alerts',
                ICON_FLAG = 'img/flag.png',
                ICON_SOUND= 'img/icon_sound2.jpg',
                ICON_MIPOS = 'img/tuz_geo32.png',
                MX_ELEM_REQUEST=24,
                REFRESH_BUS_INTERVAL = 3000,
                REFRESH_BUS_DISTANCES = 9000,
                MODE = 'DESARROLLO';
                //MODE = 'RELEASE';
          var default_position = new google.maps.LatLng(-33.294378,-66.331383); //SAN LUIS CENTER
          var filter={ tpte: 'Todos', corredor: ''};
          var pos;

          function displayUnblock () { 
              $.mobile.loading("hide");
          }

          function displayBlock(text){
              $.mobile.loading( 'show', {
                  text: text,
                  textVisible: true,
                  theme: "a",
                  textonly: false
              });
          }

          var sort_by = function(field, reverse, primer){
             var key = primer ? 
                 function(x) {return primer(x[field])} : 
                 function(x) {return x[field]};
             reverse = [-1, 1][+!!reverse];
             return function (a, b) {
                 return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
               } 
          }

          function personalizeMenuActions(){
              //if (marks_sound.length == 0){
                ////$("#itemAlarmas").hide();
                //disabledButton('itemAlarmas');
              //}
              //else{
                ////$("#itemAlarmas").show();
                //enabledButton('itemAlarmas');
              //}
          }

          function addCustomActionMap() {
            $("#navActionMap").css('display','block');
            //map.controls[google.maps.ControlPosition.LEFT_TOP].push(document.getElementById('navActionMap'));
          }

          function isModeHandMap(){
            return ($("#btn_hand").attr('class').indexOf('ui-btn-active') > -1);
          }

          function bindEvents() {
              $("#btn_hand").bind('touchstart mousedown', function(){
                if ((zoom_level != undefined) && (zoom_level > 0)){
                  map.setZoom(zoom_level);
                }
                map.setOptions({ draggableCursor: 'url(http://maps.google.com/mapfiles/openhand.cur), move' });
              });
              $("#btn_maker").bind('touchstart mousedown', function(){
                zoom_level = map.getZoom();
                map.setZoom(16);
                map.setOptions({ draggableCursor: 'crosshair' });
              });
              $("#btnBorrarHistTpteCorredor").bind('touchstart mousedown', function(){
                v_add_storage = [];
                localStorage.setItem(KEY_HIST, '');
                closeHistoryPopup();
                disabledButton('btn_history');
              });

              $("#btn_bus").bind('touchstart mousedown', function(){
                  $("#searchBox").autocomplete("clear");
                  $("#searchBox").attr("placeholder","Transporte...");
                  $("#searchBox").autocomplete("update", { source: v_provider_tpte, minLength:1});
                  if (!filtroTransporte()){ $('#searchBox').val(''); }
                  else{ $('#searchBox').val(filter.tpte); }
              });
              $("#btn_history").bind('touchstart mousedown', function(){
                showHistoryPopUp();
              });

              $("#btnGpsSearch").bind('touchstart mousedown', function(){
                geoCodingAddress();
              });

              $("#btn_road").bind('touchstart mousedown', function(){
                  $("#searchBox").autocomplete("clear");
                  $("#searchBox").attr("placeHolder", "Donde vas...");
                  $("#searchBox").autocomplete("update", { source: v_corredores, minLength: 3});
                  if (filter.corredor != ''){ $('#searchBox').val(filter.corredor); }
                  else{ $('#searchBox').val(''); }
              });
              //$("#btnMenu").bind('touchstart mousedown', function(){
                  //personalizeMenuActions();
              //});
              $("#btnTopSearch").bind('touchstart mousedown', function(){
                  //$("#searchBox").autocomplete("update", { source: v_corredores, minLength: 3});
                  $("#divSearchCorredores").slideToggle("slow");
              });

              $('#itemGps').bind('expand',function(){
                collapseItemMenu('itemGps');
              
                $('#popup_gps').popup('open', { transition: "flow" });
              });

              $('#itemParada').bind('expand',function(){
                if (filter.corredor ==''){
                  collapseItemMenu('itemParada');
                  showAlert('Debes filtrar por corredor.');
                  return;
                }
                if (v_marks_corredor.length < 1){
                  collapseItemMenu('itemParada');
                  showAlert('No existen paradas en el mapa.');
                  return;
                }
                if ($("#listParada").children().length < 1){
                  getParadaCercana();
                }
                else{
                  $(this).children().next().hide();
                  $(this).children().next().slideDown(700); 
                }
              });
              $('#itemParada').bind('collapse',function(){
                $(this).children().next().slideUp(700);
              });
              $('#itemMiProxBus').bind('expand',function(){
                if (!filtroTransporte()){
                  collapseItemMenu('itemMiProxBus');
                  showAlert('Debes filtrar por transporte.');
                  return;
                }
                if ($("#listBus").children().length < 1){
                  displayBlock('Cargando...')
                  checkBusCercano();
                }
                else{
                  $(this).children().next().hide();
                  $(this).children().next().slideDown(700); 
                }
              });
              $('#itemMiProxBus').bind('collapse',function(){
                $(this).children().next().slideUp(700);
              });
              $('#itemAlarmas').bind('expand',function(){
                if (marks_sound.length == 0){
                  showAlert('Debes poner puntos de avisos en el mapa');
                  collapseItemMenu('itemAlarmas');
                  return;
                }
                showListMarksSound();
                $(this).children().next().hide();
                $(this).children().next().slideDown(700);
              });
              $('#itemAlarmas').bind('collapse',function(){
                $(this).children().next().slideUp(700);
              });
              $("#nav-panel").on("panelopen", function( event, ui ){
                timerBusDistances = setInterval(getBusDistances, REFRESH_BUS_DISTANCES);
              });
              $("#nav-panel").on("panelclose", function( event, ui ){
                clearMarkerAnimation(marks_sound);
                clearMarkerAnimation(marks_bus);
                clearInterval(timerBusDistances);
              });
              google.maps.event.addListener(map, "click", function(event) {
                if (!isModeHandMap()){
                  var checkPoint = addCheckPoint(event.latLng);
                  addLocalHistory(KEY_HIST_ALERTS,v_add_points,{lat:checkPoint.getPosition().lat(),lng:checkPoint.getPosition().lng()});
                  showListMarksSound();
                }
              });
          }

          function personalizeApp() {
            var topA = parseInt($("#headerapp").css('height'));
            $("#divSearchCorredores").css('top',topA);
            $("#navActionMap").css('top', topA + 10);
          }

          function initialize(){
              displayBlock('Cargando mapa...');
              getInfoMapa();
              var mapOptions = {
                  mapTypeControl:false,
                  disableDefaultUI:false, 
                  scrollwheel: true,
                  panControl: true,
                  streetViewControl: false,
                  mapTypeId: google.maps.MapTypeId.ROADMAP,
                  center: default_position,
                  zoom: 13,
                  minZoom:9,
                  maxZoom:18,
                  zoomControlOptions: {
                      style: google.maps.ZoomControlStyle.BIG,
                      position: google.maps.ControlPosition.LEFT_BOTTOM
                  },
                  panControlOptions: {
                      position: google.maps.ControlPosition.RIGHT_BOTTOM
                  } 
              };
              map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
              
              bindEvents();
              loadLocalHistory();
              addSavedPoints();
              addCurrentPosition();
              
              if ((v_add_storage == undefined)||(v_add_storage.length < 1)){
                disabledButton('btn_history');
              }
              //var drawingManager = new google.maps.drawing.DrawingManager({
                //drawingControl: true,
                //drawingControlOptions: {
                  //position: google.maps.ControlPosition.TOP_LEFT,
                  //drawingModes: [ google.maps.drawing.OverlayType.MARKER ]
                //}});
              //drawingManager.setMap(map); 
              //google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
                //if(event.type == google.maps.drawing.OverlayType.MARKER) {
                  //var checkPoint = addCheckPoint(event.overlay.position);
                  //event.overlay.setMap(null);
                  //addLocalHistory(KEY_HIST_ALERTS,v_add_points,{lat:checkPoint.getPosition().lat(),lng:checkPoint.getPosition().lng()});
                  //showListMarksSound();
                //}
              //});
              $(".gmnoprint .gm-style-cc").css('display','none !important');
              addCustomActionMap();
          }
          
          var locationA;
          function geoCodingAddress() {
             locationA = null;
             var address = $("#searchBoxGpsOrig").val();
             address+=',San Luis,Argentina';
             var geocoder = new google.maps.Geocoder();
             geocoder.geocode( { 'address': address}, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                  locationA=results[0].geometry.location;
                  var addressb = $("#searchBoxGpsDest").val();
                  addressb+=',San Luis,Argentina';
                  geocoder.geocode( { 'address': addressb}, function(results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                      locationB=results[0].geometry.location;
                      drawRoad(locationA,locationB);
                    }
                  }
                  );
                } else {
                  alert('Geocode was not successful for the following reason: ' + status);
                }
             });
             $("#popup_gps").popup("close");
          }

          function showAlert(msg){
            $("#alertContent").empty();
            $("#alertContent").append('<p style="display:inline !important;"><img style="padding-right:10px" width=36 height=36 src="img/info.png"/>');
            $("#alertContent").append(msg);
            $("#alertContent").append('</p>');
            $('#popup_alert').popup('open', { transition: "flow" });
          }

          function addCheckPoint(latLng){
              if (marks_sound === null){ marks_sound = []; }
              var check = new google.maps.Marker({
                //icon: new google.maps.MarkerImage(ICON_SOUND),
                position: latLng,
                draggable: true,
                map: map,
                title: "Punto de Aviso #" + marks_sound.length
              });
              google.maps.event.addListener(check, 'click', function () {
                   infowindow.setContent($(this)[0].tittle);
                   infowindow.open(map, this);
              });
              google.maps.event.addListener(check, 'dragend', function(event){
                //check.setTitle("Punto de Aviso #" + marks_sound.length);
                 //var ind = parseInt(check.getTitle().split("#")[1]);
                 //marks_sound[ind].position = check.position;
              });
              marks_sound.push(check);
              return check;
          }

          function collapseItemMenu(id) {
             $('#'+id).trigger('collapse');  
             $('#'+id).attr('data-icon', 'arrow-d');
          }

          function enabledButton(id) {
            $('#'+id).removeClass('ui-disabled');
          }

          function disabledButton(id) {
            $('#'+id).addClass('ui-disabled');
          }


          function addSavedPoints(){
              $.each(v_add_points, function(i, item) {
                addCheckPoint(new google.maps.LatLng(item.lat,item.lng));
              });
          }

          function filtroTransporte(){
            return ((filter.tpte!='')&&(filter.tpte != 'Todos'));
          }

          function addLocalHistoryCorrTpe(){
            if ((filter.corredor!='')&&(filtroTransporte())){
              enabledButton('btn_history');
              if (v_add_storage === null){
                  v_add_storage = [];
              }
              filter.corredor = filter.corredor.trim();
              filter.tpte = filter.tpte.trim();
              var ind = 0;
              var res = $.grep(v_add_storage, function(obj,i){ 
                var resbool = obj.c == filter.corredor;
                if (resbool){ind = i;}
                return resbool;
              });
              if (res.length === 0){
                var js = {c:filter.corredor,t:[filter.tpte]};
                v_add_storage.push(js);
                localStorage.setItem(KEY_HIST, JSON.stringify(v_add_storage));
              }
              else if ($.inArray(filter.tpte, res[0].t) == -1) {
                  res[0].t.push(filter.tpte);
                  v_add_storage[ind] = res[0];
                  localStorage.setItem(KEY_HIST, JSON.stringify(v_add_storage));
              }
            }
          }

          function closeHistoryPopup() {
            $('#popup_history').popup( 'close', { transition: "flow" });
          }

          function showHistoryPopUp(){
            $('#listHistory').empty();
            $.each(v_add_storage, function(i, item) {
              if (item.t != undefined && item.t.length > 0){
                $.each(item.t, function(h, transporte){
                       $('#listHistory').append(
                          '<li id="liHistBtn'+i.toString()+h.toString()+'"><a id="itemHistBtn' + (i+h) + '">' +
                            '<img style="width:34px; height:46px;margin: 20px 0px 20px 20px" src="' + getBusIcon(transporte) + '" />'+
                            '<h3>' + item.c + '</h3>' +
                            '<h4>' + transporte + '</h4>'+
                            '</a><a id="itemHistDel' + (i.toString()+h.toString()) + '" data-rel="popup" class="delete" data-position-to="window" data-transition="pop"></a>'+
                            '</li>');
                    $('#listHistory').listview('refresh');
                });
              }
              $('#popup_history').popup('open', { transition: "flow" });
            });
          }

          function addLocalHistory(key,arr,item){
            if ($.inArray(item, arr) == -1) {
              if (arr === null){
                arr = [];
              }
              arr.push(item);
              localStorage.setItem(key, JSON.stringify(arr));
            }
          }

          function loadLocalHistory(){
            items1 = localStorage.getItem(KEY_HIST);
            items2 = localStorage.getItem(KEY_HIST_ALERTS);
            if (items1) {
              v_add_storage= JSON.parse(items1);
            }
            if(items2){
              v_add_points = JSON.parse(items2);
            }
          } 

          function removeLocalHistory(key,arr,item) {
            var result = $.grep(arr, function(e){ return e.lat == item.lat && e.lng == item.lng; });
            $.each(v_add_points, function(i, elem) {
              if (elem != undefined && elem.lat == item.lat && item.lng == elem.lng){
                marks_sound[i].setMap(null);
                marks_sound.splice(i,1);
                arr.splice(i, 1);
                localStorage.setItem(key, JSON.stringify(arr));
                return;
              }
            });
          } 

          function modoDesarrollo() {
            return (MODE == 'DESARROLLO');
          }

          function debug (argument) {
            console.log(argument);
          }

          function checkPuntoCercano(){
              const RANGO = 0.15;
              if ((marks_sound.length == 0) || (!filtroTransporte())) return;
              var pos_point=[], pos_bus=[];
              $.each(marks_sound, function(i, ps){
                  pos_point.push({lat: ps.getPosition().lat(), lon: ps.getPosition().lng()});
              });
              $.each(marks_bus, function(i, pb){
                  pos_bus.push({lat: pb.getPosition().lat(), lon: pb.getPosition().lng()});
              });
              $.ajax({
                url: URL_DISTANCE,
                type: 'POST',
                data: {alarmas: JSON.stringify(pos_point), buses: JSON.stringify(pos_bus)},
                dataType: 'JSON',
                success: function(json) {
                    var point = json.lat+'_'+json.lon;
                    if ((parseFloat(json.distance) < RANGO) && ($.inArray(point, coords_beep) == -1)){
                        panTo(json.lat,json.lon);
                        playBeep();
                        if (coords_beep.length == 20){
                          coords_beep = [];
                        }
                        coords_beep.push(point);
                        return;
                    }
                }
              });
          }

          function panTo(lat,lon){
            var hh = new google.maps.LatLng(lat, lon);
            map.panTo(hh);
          }

          function checkBusCercano(){
              blockedBUS = true;
              //calculo el bus cercano en relacion a la parada
              //if (v_paradaCercana == undefined){ 
                //getParadaCercana();
                //return;
              //}
              var distances = [], req=[], v_tmp = [];
              //distances.sort(sort_by('dis', true, parseInt));
              var service = new google.maps.DistanceMatrixService();
              $.each(marks_bus, function(i, pb){
                  var dis = distanceTo(pos.lat(),pos.lng(),pb.getPosition().lat(),pb.getPosition().lng());
                  dis = parseInt(dis.replace(/\D/g,''));
                  v_tmp.push({id:pb.id,dis:dis,lat:pb.getPosition().lat(),lng:pb.getPosition().lng()});
              });
              v_tmp.sort(sort_by('dis', true, parseInt));
              if (modoDesarrollo()){
                  $.each(v_tmp, function(h, x) { 
                    debug(x.id + ' ' + x.dis);
                  });
              }
              $.each(v_tmp, function(h, bus) { 
                if (h > 18) return;
                req.push(new google.maps.LatLng(bus.lat, bus.lng));
              });
                //origins: [v_paradaCercana], 
              service.getDistanceMatrix({
                origins: [pos], 
                destinations: req,
                travelMode: google.maps.TravelMode.DRIVING, avoidHighways: false, avoidTolls: false
              }, function (data, status) {
                    blockedBUS = false;  
                    displayUnblock();
                    if (status == google.maps.DistanceMatrixStatus.OK) {
                      var bus_times = data.rows[0].elements;
                      $.each(bus_times, function(i, destino){
                          distances[i] = {id:'Cole(' + v_tmp[i].id.split('(')[1]};
                          distances[i].time = destino.duration.text;
                          distances[i].distance = destino.distance.text;
                          if (destino.duration.text.indexOf('h') > -1){
                            var format=destino.duration.text.split('h');
                            var horas=parseInt(format[0]);
                            num_tmp = (horas*60) + parseInt(format[1].replace(/\D/g,''));
                          }
                          else{
                            num_tmp = parseInt(destino.duration.text.replace(/\D/g,''));
                          }
                          distances[i].distance
                          distances[i].sort = num_tmp;
                      });
                      distances.sort(sort_by('sort', true, parseInt));
                      showListBus(distances.slice(0,7));
                    }
              });
          }

          function distanceTo(lat1,lon1,lat2,lon2) {
              var R = 6371; // km
              var dLat = (lat2-lat1).toRad();
              var dLon = (lon2-lon1).toRad();
              var lat1 = lat1.toRad();
              var lat2 = lat2.toRad();

              var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
              var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
              var d = R * c;
              
              return d.toFixed(6);
          }

          function addItemTransporte(trans){
            if (!trans) return;
            trans = trans.substring(0,trans.indexOf('('));
            if ($.inArray(trans, v_provider_tpte) == -1){
              if (v_provider_tpte === null){
                v_provider_tpte = [];
              }
              v_provider_tpte.push(trans);
            }
          }

          function removemarks_bus(){
              $.each(marks_bus, function(h, point_bus){
                point_bus.setMap(null);
              });
              marks_bus = [];
          }

          function addCurrentPosition(){
              navigator.geolocation.getCurrentPosition(
                function(position) {
                  pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                  map.panTo(pos);
                  new google.maps.Marker({
                      icon: new google.maps.MarkerImage(ICON_MIPOS),
                      position: pos,
                      map: map,
                      draggable: false,
                      title: 'Tu estas aqui ' + pos,
                      animation: google.maps.Animation.DROP
                  });
                },
                function() {
                /*marker.setPosition(default_position);
                marker.setMap(map);*/
                }
             );
          }

          function addParadas(){
            clearPolylines();
            if (v_paradas[filter.corredor] == undefined){ return; }
            $.each(v_marks_corredor, function(h, parada){
                parada.setMap(null);
            });
            v_marks_corredor=[];
            $.each(v_paradas[filter.corredor], function(h, data){
              var tmp = new google.maps.Marker({
                  'map': map,
                  'icon': new google.maps.MarkerImage(ICON_FLAG),
                  'position': new google.maps.LatLng(data.latitud, data.longitud),
                  'tooltip': "Parada: <b>"+ data.parada + "</b><br>Tipo Parada: "+ data.tipoParada + "<br> "
                            +" Sentido: " + data.sentido
                            +"<br>Lat: " + data.latitud + "  Lng: " + data.longitud
              });
              google.maps.event.addListener(tmp, 'click', function () {
                            infowindow.setContent($(this)[0].tooltip);
                            infowindow.open(map, this);
                          });
              v_marks_corredor.push(tmp);
            });
          }

          function sleep(milliseconds) {
            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
              if ((new Date().getTime() - start) > milliseconds){
                break;
              }
            }
          }

          function getParadaCercana(){
            if (filter.corredor =='')return;
            displayBlock('Localizando Parada...')
            //v_paradasTimes=[];
            //corredorService();
            //return;

            //deprecated?
            var service = new google.maps.DistanceMatrixService();
            //pos = new google.maps.LatLng(marks_sound[marks_sound.length-1].getPosition().lat(), marks_sound[marks_sound.length-1].getPosition().lng()); 
            //var miPos;
            //if (modoDesarrollo()){ miPos = new google.maps.LatLng(marks_sound[marks_sound.length-1].getPosition().lat(), marks_sound[marks_sound.length-1].getPosition().lng()); }
            //else{ miPos = pos; }
            var req=[];
            var disParadas=[];

            $.each(v_marks_corredor, function(h, par) { 
                var dis = distanceTo(pos.lat(),pos.lng(),par.getPosition().lat(),par.getPosition().lng());
                dis = parseInt(dis.replace(/\D/g,''));
                disParadas.push({id:par.id,dis:dis,lat:par.getPosition().lat(),lng:par.getPosition().lng()});
            });
            disParadas.sort(sort_by('dis', true, parseInt));
            if (disParadas[0].dis.toString().length > 6){
              corredorService();
              collapseItemMenu('itemParada');
              return;
            }
            $.each(disParadas,function(i, obj){
              if (i > 22) return;
              debug(obj.id + ' ' + obj.dis);
              req.push(new google.maps.LatLng(obj.lat,obj.lng));
            });
            service.getDistanceMatrix({
              origins: [pos], destinations: req,
              travelMode: google.maps.TravelMode.WALKING, avoidHighways: false, avoidTolls: false
            }, function (data, status) {
                  displayUnblock();
                  var paradasResult=[];
                  if (status == google.maps.DistanceMatrixStatus.OK) {
                    var distances = data.rows[0].elements;
                    $.each(distances, function(i, destino){
                      paradasResult.push({time: destino.duration.text, lat:disParadas[i].lat, lng:disParadas[i].lng});
                    });
                    //reordeno el array para un mejor resultado
                    $.each(paradasResult, function(h, obx){
                       if (obx.time.indexOf('h') > -1){
                         var format=obx.time.split('h');
                         var horas=parseInt(format[0]);
                         num_tmp = (horas*60) + parseInt(format[1].replace(/\D/g,''));
                       }
                       else{
                         num_tmp = parseInt(obx.time.replace(/\D/g,''));
                       }
                       obx.mintime = num_tmp;
                    });
                    paradasResult.sort(sort_by('mintime', true, parseInt));
                    showListParadas(paradasResult.slice(0,5));
                    if (modoDesarrollo()){
                      $.each(distances, function(i, destino){
                        debug(data.destinationAddresses[i]);
                        debug(destino.duration.text);
                      });
                    }
                  }
            });
          }

          /*recursivo sincronico metodo */
          function corredorService(i){
                if (i == undefined) i = 0;
                var req=[];
                req=[];
                $.each(v_marks_corredor, function(h, parada) { req.push(new google.maps.LatLng(parada.getPosition().lat(), parada.getPosition().lng()));});
                var destinations = req.slice(i,MX_ELEM_REQUEST+i);
                var service = new google.maps.DistanceMatrixService();
                if ((destinations.length == 0)&&(v_paradasTimes.length > 0)){
                  var pos_array = 0, num_tmp;
                  $.each(v_paradasTimes, function(h, destino){
                     if (destino.duration.text.indexOf('h') > -1){
                       var format=destino.duration.text.split('h');
                       var horas=parseInt(format[0]);
                       num_tmp = (horas*60) + parseInt(format[1].replace(/\D/g,''));
                     }
                     else{
                       num_tmp = parseInt(destino.duration.text.replace(/\D/g,''));
                     }
                     if (h == 0) menor = num_tmp;
                     if (num_tmp < menor) {
                       menor = num_tmp;
                       pos_array = h;
                     }
                  });
                  req=[];
                  var miPos=pos;
                  //if (modoDesarrollo()){ miPos = new google.maps.LatLng(marks_sound[marks_sound.length-1].getPosition().lat(), marks_sound[marks_sound.length-1].getPosition().lng()); }
                  //else{ miPos = pos; }
                  var dest1 = new google.maps.LatLng(v_marks_corredor[pos_array].getPosition().lat(), v_marks_corredor[pos_array].getPosition().lng());
                  v_paradaCercana=dest1
                  displayUnblock();
                  drawRoad(miPos,dest1);
                  return;
                }
                var miPos=pos;
                //if (modoDesarrollo()){ miPos = new google.maps.LatLng(marks_sound[marks_sound.length-1].getPosition().lat(), marks_sound[marks_sound.length-1].getPosition().lng()); }
                //else{ miPos = pos; }
                service.getDistanceMatrix({
                  origins: [miPos], destinations: destinations,
                  travelMode: google.maps.TravelMode.WALKING, avoidHighways: false, avoidTolls: false
                }, function (data, status) {
                      if (status == google.maps.DistanceMatrixStatus.OK) {
                        var distances = data.rows[0].elements;
                        if (v_paradasTimes.length > 0){ v_paradasTimes=v_paradasTimes.concat(distances);}
                        else{v_paradasTimes=distances}
                        if (modoDesarrollo()){
                          $.each(distances, function(i, destino){
                            debug(data.destinationAddresses[i]);
                            debug(destino.duration.text);
                          });
                        }
                        corredorService(i+MX_ELEM_REQUEST);
                      }
                });
            }
          
          //deprecated
          function getParadaCercanaCallBack(i) {
              return function (data, status) {
                  if (status == google.maps.DistanceMatrixStatus.OK) {
                      var distances = data.rows[0].elements;
                      if (v_paradasTimes.length > 0){ v_paradasTimes=v_paradasTimes.concat(distances);}
                      else{v_paradasTimes=distances}
                      $.each(distances, function(i, destino){
                        console.log(data.destinationAddresses[i]);
                        console.log(destino.duration.text);
                 //drawRoad(miPos,response.
                      });
                      var pos_array = 0;
                      if (v_paradasTimes.length == v_marks_corredor.length){
                         $.each(v_paradasTimes, function(i, destino){
                           console.log(destino.duration.text);
                           if (destino.duration.text.indexOf('h') > -1){
                             var format=destino.duration.text.split('h');
                             var horas=parseInt(format[0]);
                             num_tmp = (horas*60) + parseInt(format[1].replace(/\D/g,''));
                           }
                           else{
                             num_tmp = parseInt(destino.duration.text.replace(/\D/g,''));
                           }
                           if (i == 0) menor = num_tmp;
                           if (num_tmp < menor) {
                             menor = num_tmp;
                             pos_array = i;
                           }
                         });
                         console.log('Menor distancia: ' + menor + 'min');
                         if (pos_array != undefined){
                           var miPos = new google.maps.LatLng(marks_sound[0].getPosition().lat(), marks_sound[0].getPosition().lng());
                           var dest1 = new google.maps.LatLng(v_marks_corredor[pos_array].getPosition().lat(), v_marks_corredor[pos_array].getPosition().lng());
                           var dest2 = new google.maps.LatLng(
                            v_marks_corredor[v_marks_corredor.length - pos_array].getPosition().lat(), 
                            v_marks_corredor[v_marks_corredor.length - pos_array].getPosition().lng());
                           drawRoad(miPos,dest1);
                           drawRoad(miPos,dest2);
                         }
                         displayUnblock();
                      }
                  }
                  else{ console.error('Error getParadaCercanaCallBack() ' + status);
                        displayUnblock();
                  }
              }
          }

          function sortParadas(){
            var v_temp = [];
            var g_search = [];
            var ppos;
            $.each(v_marks_corredor, function(i, parada){
              ppos = parada.position;
              ppos = ppos.toString().split(", ");              
              v_temp.push({ lat: ppos[0].replace(/\D/g,''), lng: ppos[1].replace(/\D/g,'')});
            });
            var obj_pos = marks_sound[0].position.toString().split(", ");              
            //var obj_pos = pos.toString().split(", ");              
            obj_pos = { lat:obj_pos[0].replace(/\D/g,''), lng:obj_pos[1].replace(/\D/g,'')}; 
            v_temp.push(obj_pos);
            v_temp = v_temp.sort(by('lat'),by('lng'));

            $.each(v_temp, function(i, parada){
              console.log(parada.lat + '  ' + parada.lng);
            });
            //return;

            $.each(v_temp, function(i, parada){
              if (parada.lat == obj_pos.lat && parada.lng == obj_pos.lng){
                var z=i, tamArr=0;
                while(g_search.length < 24){
                      if ((i+1) < v_temp.length){
                          g_search.push(new google.maps.LatLng(
                            v_temp[++i].lat.insert(0,'-').insert(3,'.'),
                            v_temp[i].lng.insert(0,'-').insert(3,'.')
                          ));
                      }
                      if ((z-1) > -1){
                          g_search.push(new google.maps.LatLng(
                            v_temp[--z].lat.insert(0,'-').insert(3,'.'),
                            v_temp[z].lng.insert(0,'-').insert(3,'.')
                          ));
                      }
                      //si no se agrego elementos al array, esta lleno
                      if (g_search.length == tamArr){ return; }
                      else{ tamArr = g_search.length; }
                }
              }
            });
            var miPos = new google.maps.LatLng(obj_pos.lat.insert(0,'-').insert(3,'.'),obj_pos.lng.insert(0,'-').insert(3,'.'));
            var service = new google.maps.DistanceMatrixService();
            service.getDistanceMatrix(
            {
              origins: [miPos],
              destinations: g_search,
              travelMode: google.maps.TravelMode.WALKING,
              //travelMode: google.maps.TravelMode.DRIVING,
              avoidHighways: false,
              avoidTolls: false
            }, function callback(response, status) {
               console.log(response);
               var menor, num_tmp, pos_array=0;
               var destinos = response.rows[0].elements;
               $.each(destinos, function(i, destino){
                 console.log(destino.duration.text);
                 if (destino.duration.text.indexOf('h') > -1){
                   var format=destino.duration.text.split('h');
                   var horas=parseInt(format[0]);
                   num_tmp = (horas*60) + parseInt(format[1].replace(/\D/g,''));
                 }
                 else{
                   num_tmp = parseInt(destino.duration.text.replace(/\D/g,''));
                 }
                 if (i == 0) menor = num_tmp;
                 if (num_tmp < menor) {
                   menor = num_tmp;
                   pos_array = i;
                 }
               });
               if (pos_array != undefined){
                 //drawRoad(miPos,response.destinationAddresses[pos_array]);
                 //drawRoad(miPos,g_search[pos_array]);
                $.each(g_search, function(i, destino){
                  drawRoad(miPos,destino);
                });
               }
            });
            }

          function showSteps(directionResult) {
            $.each(v_step_point, function(n, mark_step) { mark_step.setMap(null); });
            v_step_point = [];
            var myRoute = directionResult.routes[0].legs[0];
            $.each(myRoute.steps, function(i, step){
              var marker = new google.maps.Marker({
                position: step.start_point,
                map: map,
                tooltip: step.instructions
              });
              //attachInstructionText(marker, step.instructions);
              google.maps.event.addListener(marker, 'click', function () {
                infowindow.setContent($(this)[0].tooltip);
                infowindow.open(map, this);
              });
              //infowindow.open(map, this);
              v_step_point.push(marker);
            });
          }

          function showDirectionsHelpPanel(){
              $("#directions-panel").panel("open");
              $("#directions-panel").on("panelopen", function( event, ui ) {
                $('.adp-legal').remove();
                $('.warnbox-content').remove();
                $('.adp-warnbox').remove();
              });
          }

          function drawRoad(origen,destino){
            var rendererOptions = { map: map }
            var directionsService = new google.maps.DirectionsService();
            var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions) 
            var request = {
                origin: origen,
                destination: destino,
                travelMode: google.maps.TravelMode.WALKING
            };
            directionsService.route(request, function(response, status) {
              if (status == google.maps.DirectionsStatus.OK) {
                $("#directions-panel").empty();
                var rendererOptions = {
                    map: map,
                    suppressMarkers : true,
                    suppressPolylines : true,
                    preserveViewport: true } 
                directionsDisplay.setOptions(rendererOptions);
                directionsDisplay.setPanel(document.getElementById('directions-panel'));
                directionsDisplay.setDirections(response);
                showDirectionsHelpPanel();
                drawPolyline(response.routes[0].legs[0].steps);
                map.panTo(response.routes[0].legs[0].start_location);
                //showSteps(response);
              }
            });
          }

          function clearPolylines(){
            if (polyline_parada != undefined){
              polyline_parada.setMap(null);
              
            }
          }
          
          function drawPolyline(steps){    
              clearPolylines();
              var path = [];
              for(var step = 0; step < steps.length; step++){
                for(var stepP = 0; stepP < steps[step].path.length; stepP++){
                  path.push(steps[step].path[stepP]);
                }
              }
            
              var polySelected = {'strokeWeight':'6','strokeColor':'red'};
              var polyUnselected = {'strokeWeight':'6','strokeColor':'blue'} ;
              
              polyline_parada = new google.maps.Polyline(polyUnselected);
              polyline_parada.setPath(path);
              polyline_parada.setMap(map);
              google.maps.event.addListener(polyline_parada, 'mouseover', function(){polyline_parada.setOptions(polySelected);});
              google.maps.event.addListener(polyline_parada, 'mouseout', function(){polyline_parada.setOptions(polyUnselected);});
              google.maps.event.addListener(polyline_parada, 'mousedown', function(){ showDirectionsHelpPanel();});
          }

          function filterBus(){
             $.each(marks_bus, function(n, elem) {
                if ((filter.tpte != 'Todos')&&(elem.id == undefined)||(elem.id.indexOf(filter.tpte) < 0)){
                  elem.setMap(null);
                }
                else{
                  elem.setMap(map);
                }
             });
          }

          function getBusIcon(nom_trans){
            var img = 'img/bus_';
            if (nom_trans == undefined) return img+='white.png';
            if (nom_trans.indexOf('Sol Bus') > -1) img+='yellow';
            else if (nom_trans.indexOf('Polo') > -1)img+='blue';
            else if (nom_trans.indexOf('Rotte') > -1)img+='red';
            else if (nom_trans.indexOf('Del Rosario') > -1)img+='pink';
            else if (nom_trans.indexOf('Portal de Cuyo') > -1)img+='green';
            else img+='white'
            return img+='.png';
          }

          var firstInfoMapCallback=true;
          function getInfoMapa() {
              $.ajax({
                url: URL_GPS_BUS+"&tpte="+filter.tpte,
                type: 'GET',
                dataType: 'text',
                success: function(text) {
                            if (blockedBUS) return;
                            var clean = text.replace(/\t/g,',');
                            clean = clean.split("\n");
                            removemarks_bus();
                            $.each(clean, function(n, elem) {
                                if ((n != 0)&&(filter.tpte == 'Todos' || elem.indexOf(filter.tpte) > -1)){
                                    clean = elem.split(',');
                                    var lat = clean[0], long = clean[1], nom_trans = clean[2], veloc = clean[3];
                                    if (firstInfoMapCallback){
                                      addItemTransporte(nom_trans);
                                    }
                                    marker = new google.maps.Marker({	  
                                           id: nom_trans,
                                         icon: new google.maps.MarkerImage(getBusIcon(nom_trans)),
                                          map: map,
                                     position: new google.maps.LatLng(lat, long),
                                      tooltip: "<b>"+ nom_trans + "</b><br>"+ veloc + "<br>" + "Coords:" + lat + " " + long
                                    });
                                    google.maps.event.addListener(marker, 'click', function () {
                                      infowindow.setContent($(this)[0].tooltip);
                                      infowindow.open(map, this);
                                    });
                                    marks_bus.push(marker);
                                }
                             });
                             firstInfoMapCallback=false;
                            }
                });
                checkPuntoCercano();
          }

          function gotoBus(bus_id) {
              clearMarkerAnimation(marks_bus);
              var ind=-1;
              var res=$.grep(marks_bus, 
                function(obj,i){ 
                  var res = false;
                  if (obj.id != undefined){
                    res = obj.id.replace(/\D/g,'') == bus_id;
                  }
                  if (res){ ind=i; }
                  return res;
              });
              if (res.length != 0){
                var lat = marks_bus[ind].getPosition().lat();
                var lng = marks_bus[ind].getPosition().lng();
                panTo(lat,lng);
                marks_bus[ind].setAnimation(google.maps.Animation.BOUNCE);
              }
            
          }

          google.maps.event.addDomListener(window, "load", 
            function(){
              initialize()
              setInterval(getInfoMapa, REFRESH_BUS_INTERVAL);
              loadAutocomplete();
            }
          );

          function getBusDistances() {
              if (!filtroTransporte()){
                return;
              }
              checkBusCercano();
          }

          $(document).on("click", '[id^=itemMarkerAlert]', function(event, ui) {
              var lat, lng;
              var $lat = $(this).data('marker-lat');
              var $lng = $(this).data('marker-lng');
              lat = $lat;
              lng = $lng;

              panTo(lat,lng);
              var ind=-1;

              clearMarkerAnimation(marks_sound);
              var res=$.grep(marks_sound, 
                function(obj,i){ 
                  var res = obj.getPosition().lat() == lat && obj.getPosition().lng() == lng 
                  if (res){ ind=i; }
                  return res;
              });
              if (res.length != 0){ marks_sound[ind].setAnimation(google.maps.Animation.BOUNCE); }
          });

          function clearMarkerAnimation(arrMarkers) {
              $.each(arrMarkers, function(n, elem) {
                elem.setAnimation(null);
              });
          }

          $(document).on("click", '[id^=itemDelAllSound]', function(event, ui) {
            $.each(marks_sound, function(n, elem) { elem.setMap(null); });
            v_add_points=[]; marks_sound=[];
            localStorage.setItem(KEY_HIST_ALERTS, []);
            $('#listMarksSounds li').remove();
            collapseItemMenu('itemAlarmas');
            //personalizeMenuActions();

          });
          //$(document).on("click", '[id=itemAlarmas]', function(event, ui){
              //if ($("#submenuAlarmas").attr('data-icon') == 'arrow-r'){
                //$('#submenuAlarmas').buttonMarkup({ icon: "arrow-d" });
                //$("#listMarksSounds").slideDown();
              //}
              //else{
                //$('#submenuAlarmas').buttonMarkup({ icon: "arrow-r" });
                //$("#listMarksSounds").slideUp();
              //}
              //showListMarksSound();
          //});

          $(document).on("click", '[id^=itemHistDel]', function(event, ui) {
            var corr = $("#"+$(this).parent().attr('id') + " h3").text();
            var tpte = $("#"+$(this).parent().attr('id') + " h4").text();
            var ind = 0;
            var res = $.grep(v_add_storage, function(obj,i){ 
              var resbool = obj.c == corr;
              if (resbool){ind = i;}
              return resbool;
            });
            if (res.length != 0){
              if ((res[0].t != undefined) && (res[0].t.length != 0)){
                var iT = $.inArray(tpte, res[0].t);
                if (iT > -1){
                  res[0].t.splice(iT,1);
                  v_add_storage[ind] = res[0];
                }
              }
              if (res[0].t.length == 0){
                  v_add_storage.splice(ind,1);
              }
              localStorage.setItem(KEY_HIST, JSON.stringify(v_add_storage));
              if ((v_add_storage == undefined)||(v_add_storage.length < 1)){
                disabledButton('btn_history');
                $('#popup_history').popup('close');
                return;
              }
              $(this).closest ("li").remove();
            }
          });

          $(document).on("click", '[id^=itemHistBtn]', function(event, ui) {
            filter.corredor = $("#"+$(this).attr('id')).children()[1].innerText;
            filter.tpte = $("#"+$(this).attr('id')).children()[2].innerText;
            $("#listParada").empty();
            addParadas();
            filterBus();
            $('#popup_history').popup('close');
            $("#divSearchCorredores").slideToggle("slow");
          });

          $(document).on("click", '[id^=itemMarkBus]', function(event, ui) {
              var $id = $("#"+$(this).attr('id')).children()[0].innerText;
              gotoBus($id.split(')')[0].replace(/\D/g,''));
          });

          $(document).on("click", '[id^=itemPar]', function(event, ui) {
              var lat, lng;
              var $lat = $(this).data('marker-lat');
              var $lng = $(this).data('marker-lng');
              var lat = $lat;
              var lng = $lng;
              var dest1 = new google.maps.LatLng(lat,lng);
              drawRoad(pos,dest1);
          });

          $(document).on("click", '[id^=closeAlert]', function(event, ui) {
            $('#popup_alert').popup('close', { transition: "flow" });
          });
          
          $(document).on("click", '[id^=itemMarkerDel]', function(event, ui) {
              var lat, lng;
              var $lat = $(this).data('marker-lat');
              var $lng = $(this).data('marker-lng');
              lat = $lat;
              lng = $lng;
              $(this).closest ("li").remove();
              removeLocalHistory(KEY_HIST_ALERTS,v_add_points,{lat: lat, lng: lng});
              if (v_add_points.length == 0){
                $('#listMarksSounds li').remove();
                collapseItemMenu('listMarksSounds');
                //personalizeMenuActions();
                $("#listMarksSounds" ).trigger( "updatelayout" );
              }
          });

          function showListParadas(paradas){
              $('#listBus').empty();
              $.each(paradas, function(i, item) {
                 $('#listParada').append('<li><a id="itemPar'+i+'" href="#"'+
                 ' data-marker-lat="'+ item.lat+'" data-marker-lng="'+item.lng+'">'+
                 '<h2> Parada '+ (i+1) +' - '+ item.time +'</h2>'+
                 '<a id="itemParHelp'+i+'" data-marker-lat="'+ item.lat+'" data-marker-lng="'+item.lng+'"></a></li>');
              });
              $('#listParada').listview('refresh');
              $("#listParada" ).trigger( "updatelayout" );
          }

          function showListBus(buses){
              $('#listBus').empty();
              $.each(buses, function(i, item) {
                 $('#listBus').append('<li><a id="itemMarkBus'+i+'" href="#">'+
                 '<h2>'+item.id+'   '+item.time +'</h2>'+
                 '<a id="itemMarkBus'+i+'"></a></li>');
              });
              $('#listBus').listview('refresh');
              $("#listBus" ).trigger( "updatelayout" );
          }

          function showListMarksSound(){
              $('#listMarksSounds').empty();
              if (v_add_points.length > 1){
                $('#listMarksSounds').append('<li><a id="itemDelAllSound" href="#"><h2>Borrar Todos</h2></a><a id="itemDelAllSound2" class="delete"></a></li>');
              }
              $.each(v_add_points, function(i, item) {
                 $('#listMarksSounds').append('<li><a id="itemMarkerAlert'+i+'" href="#" data-marker-lat="'+ item.lat+'" data-marker-lng="'+item.lng+'"><h2>Punto Aviso #' + i +'</h2>'+
                 '<a id="itemMarkerDel'+i+'" data-marker-lat="'+ item.lat+'" data-marker-lng="'+item.lng+'" class="delete"></a></li>');
              });
              $('#listMarksSounds').listview('refresh');
              $("#listMarksSounds" ).trigger( "updatelayout" );
          }

          $(document).on("pageshow", "#mainPage", function() {
            personalizeApp();
          });
