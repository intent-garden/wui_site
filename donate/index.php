<?php
	date_default_timezone_set('Asia/Novosibirsk');

	require_once '../init.php';

	require_once '../mail.php';

	ob_start();
?>

<!DOCTYPE html>
<html>
<head>
	<meta name="robots" content="all">
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width">
	<title>Приобретение лицензии VideoGrace Server при помощи банковской карты</title>
	<link href="../style/style.css" rel="stylesheet" type="text/css">
</head>
<body class="bodybg">
	<div class="page_body">
		<div class="page_header">
			<div class="logo">
				<img src="../res/logo.png" alt="VideoGrace" style="width:216px; height:48px;">
			</div>
<?php
	require_once '../top_menu.php';
?>
		</div>
		<div class="header_line"></div>
		<div class="page_content">

<?php

	$p = 0;
	if (isset($_GET['p']))
	{
		$p = $_GET['p'];
	}

	echo '﻿<div style="font-size: 16px;">Оплата через систему ЮКасса, сумма: '.$p.' рублей</div><br>'.
		'<form target="_blank" action="https://yoomoney.ru/eshop.xml" method="post">'.
		'<input type="hidden" name="shopId" value="105689">'.
		'<input type="hidden" name="scid" value="37967">'.
		'<input type="hidden" name="customerNumber" value="BUY_SOME">'.
		'<input type="hidden" name="sum" value="'.$p.'">'.
		'<!-- Не обязательные поля -->'.
		'<input type="hidden" name="custName" value="ME">'.
		'<input type="hidden" name="custEmail" value="udattsk@yandex.ru">'.
		'<input type="hidden" name="orderDetails" value="Nothing">'.
		'Способ оплаты:<br>'.
		'<input name="paymentType" value="PC" type="radio" id ="radPC"> <label for="radPC">Оплата со счета ЮМани</label><br>'.
		'<input name="paymentType" value="AC" type="radio" id ="radAC"> <label for="radAC">Оплата банковской картой</label><br>'.
		'<input name="paymentType" value="GP" type="radio" id ="radGP"> <label for="radGP">Оплата по коду через терминал</label><br><br>'.
		'<input type="submit" value="Оплатить"/ style="width:280px; height: 60px; background-color: green;" class="ok_submit">'.
		'</form><br><br>';

?>
		</div>
		<div class="page_footer">
<?php
	require_once "../footer.php";
?>
		</div>
	</div>

<?php
	require_once '../counters.php';
?>
</body>
</html>

<?php
	ob_flush();
?>
