<?php
	$price = "";
	if (isset($_POST['price']))
	{
		$price = $_POST['price'];
	}
		
    $email = "";
	if (isset($_POST['email']))
	{
		$email = $_POST['email'];
	}

	$fio = "";
	if (isset($_POST['fio']))
	{
		$fio = $_POST['fio'];
	}

	echo "OK;{e:\"" . $email . "\", n:\"" . $fio . "\", pr:\"" . $price . "\"}";
	
	return;
?>
