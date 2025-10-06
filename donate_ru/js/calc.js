
function setSingleForm()
{
    document.getElementById('count_capt').innerHTML = "Количество одновременно подключенных пользователей";

    calculateSinglePrice();
}

function setEnterpriseForm()
{
    document.getElementById('count_capt').innerHTML = "Количество нод (узлов сети)";

    calculateEnterprise();

}

function getChannelPrice(count, isYear)
{
    if (isYear)
    {
        return 1250;
    }
    else
    {
        return 6500;
    }
}

function calculateSinglePrice()
{
    var theForm = document.forms["buyform"];
    var channelsCount = theForm.elements["count"].value;
    var isYear = theForm.elements["year_radio"].checked;

    var channelPrice = getChannelPrice(channelsCount, isYear);
    var totalPrice = channelsCount * channelPrice;
    theForm.elements["price"].value = totalPrice;

    document.getElementById('channelPrice').innerHTML = "Цена за 1 пользователя: " + channelPrice + " ₽";

    var priceobj = document.getElementById('totalPrice');
    priceobj.innerHTML = totalPrice + " ₽";
}

function getNodePrice(count, isYear)
{
    if (isYear)
    {
        return 150000;
    }
    else
    {
        return 750000;
    }
}

function calculateEnterprise()
{
    var theForm = document.forms["buyform"];
    var nodeCount = theForm.elements["count"].value;
    var isYear = theForm.elements["year_radio"].checked;

    var nodePrice = getNodePrice(nodeCount, isYear);

    document.getElementById('channelPrice').innerHTML = "Цена за 1 ноду: " + nodePrice + " ₽";

    var totalPrice = nodeCount * nodePrice;
    theForm.elements["price"].value = totalPrice;

    var priceobj = document.getElementById('totalPrice');
    priceobj.innerHTML = totalPrice + " ₽";
}

function calculatePrice()
{
    if (document.getElementById('single_radio').checked)
    {
        calculateSinglePrice();
    }
    else
    {
        calculateEnterprise();
    }
}

function resetForm()
{
    var reqForm = document.forms["buyform"];
    console.log("reset form");
    reqForm.elements["license_type"].value = "single";
    reqForm.querySelector('.loading').classList.remove('d-block');
    reqForm.querySelector('.error-message').classList.remove('d-block');
    reqForm.querySelector('.sent-message').classList.remove('d-block');
}
