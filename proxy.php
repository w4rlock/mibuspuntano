<?php
if (!isset($_GET['url'])) die();

$url = urldecode($_GET['url']);
$url = 'http://' . str_replace('http://', '', $url); 

if ((isset($_GET['term']))&&(!empty($_GET['term']))){
    $url=$url . '&term='.$_GET['term'];
}
if ((isset($_GET['tpte']))&&(!empty($_GET['tpte']))&&($_GET['tpte'] !== 'Todos')){
    $data = explode("\n", file_get_contents($url));
    $tpte=stripslashes(urldecode($_GET['tpte']));
    foreach($data as $fila){;
        if (strpos($fila,$tpte) !== false){
            echo $fila;
            echo "\n";
        }
    }
}
else{
    echo file_get_contents($url);
}
