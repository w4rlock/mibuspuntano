<?php
    function distance($lat1, $lon1, $lat2, $lon2, $unit = 'k') {
      $theta = $lon1 - $lon2;
      $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
      $dist = acos($dist);
      $dist = rad2deg($dist);
      $dist = $dist * 60 * 1.1515;
      $unit = strtoupper($unit);

      switch($unit) {
          case 'M': break;
          case 'K' : $dist = $dist * 1.609344;
      }

      return (round($dist,2));      
    }

    $alarmas = json_decode(stripslashes($_POST['alarmas']),true);
    $buses = json_decode(stripslashes($_POST['buses']),true);
    $menor=100.00;
    $lat=0;
    $lon=0;
    foreach($alarmas as $alarma){;
        foreach($buses as $bus){
            $dis = distance($alarma['lat'], $alarma['lon'], $bus['lat'], $bus['lon']);
            if ($dis < $menor){
                $menor = $dis;
                $lat = $alarma['lat'];
                $lon = $alarma['lon'];
            }
        }
    }
    echo json_encode(array('distance'=>$menor, 'lat'=>$lat, 'lon'=>$lon));
?>
