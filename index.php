<?php

$locale = $_SERVER['HTTP_ACCEPT_LANGUAGE'];

if (strpos($locale, 'ru') !== false)
{
	header ("Location: ./main_ru/");
}
else
{
	header ("Location: ./main/");
}

?>
