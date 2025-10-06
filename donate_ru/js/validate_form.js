/**
* Form Validation 
* URL: videograce.com
* Author: IVS Org
*/

function parseResponse(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseResponse ожидает строку');
  }

  const [statusPart, payloadPart] = str.split(';', 2); // максимум два фрагмента
  const status = statusPart.trim();

  // 1) Если пришла только "OK"
  if (status === 'OK' && !payloadPart) {
    return { status };
  }

  // 2) Ошибочный ответ (любой, что не "OK")
  if (status !== 'OK') {
    return {
      status: 'ERROR',
      message: str.replace(/^ERROR[:\s]*/i, '').trim() || 'Неизвестная ошибка',
    };
  }

  // 3) "OK" + объект-нагрузка → пытаемся разобрать
  try {
    // a. превращаем {l:"single", c:"10"} → {"l":"single","c":"10"}
    const jsonLike = payloadPart
      .trim()
      // кавычки вокруг ключей
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
      // одинарные кавычки → двойные
      .replace(/'/g, '"');

    const data = JSON.parse(jsonLike);
    return { status, data };
  } catch (e) {
    return {
      status: 'ERROR',
      message: `Не удалось распарсить тело ответа: ${e.message}`,
    };
  }
}

function postWithRedirect(url, params = {}) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  form.style.display = 'none';          // чтобы не мелькала

  // заполняем скрытыми полями
  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();                        // браузер всё сделает сам
}

(function () {
  "use strict";

  let forms = document.querySelectorAll('.php-email-form');

  forms.forEach( function(e) {
    e.addEventListener('submit', function(event) {
      event.preventDefault();

      let thisForm = this;

      let action = thisForm.getAttribute('action');
      let recaptcha = thisForm.getAttribute('data-recaptcha-site-key');
      
      if( ! action ) {
        displayError(thisForm, 'The form action property is not set!');
        return;
      }
      thisForm.querySelector('.loading').classList.add('d-block');
      thisForm.querySelector('.error-message').classList.remove('d-block');
      thisForm.querySelector('.sent-message').classList.remove('d-block');
      
      let formData = new FormData( thisForm );

      if ( recaptcha ) {
        if(typeof grecaptcha !== "undefined" ) {
          grecaptcha.ready(function() {
            try {
              grecaptcha.execute(recaptcha, {action: 'php_email_form_submit'})
              .then(token => {
                formData.set('recaptcha-response', token);
                php_email_form_submit(thisForm, action, formData);
              })
            } catch(error) {
              displayError(thisForm, error);
            }
          });
        } else {
          displayError(thisForm, 'The reCaptcha javascript API url is not loaded!')
        }
      } else {
        php_email_form_submit(thisForm, action, formData);
      }
    });
  });

  function php_email_form_submit(thisForm, action, formData) {
    fetch(action, {
      method: 'POST',
      body: formData,
      headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(response => {
      if( response.ok ) {
        return response.text();
      } else {
        throw new Error(`${response.status} ${response.statusText} ${response.url}`); 
      }
    })
    .then(data => {
      thisForm.querySelector('.loading').classList.remove('d-block');


      let res = parseResponse(data);
      if (res.status == 'OK') {
        if (res.data) {
          console.log(res.data.l);

          postWithRedirect('https://yoomoney.ru/eshop.xml', { paymentType: 'AC',
            shopId: '105689',
            scid: '37967',
            customerNumber: '',
            sum: res.data.pr,
            custName: res.data.n,
            custEmail: res.data.e,
            orderDetails: 'wui_donate' });

          thisForm.reset(); 
        }
        else {
          thisForm.querySelector('.sent-message').classList.add('d-block');
          thisForm.reset(); 
        }
      }
      else {
        throw new Error(data ? data : 'Ошибка обработки формы: ' + action); 
      }

      /*if (data.includes('OK')) {
        if (data.includes('OK;{')) {

        }
        else {
          thisForm.querySelector('.invoice-accepted').classList.add('d-block');
          thisForm.reset(); 
        }
      } else {
        throw new Error(data ? data : 'Form submission failed and no error message returned from: ' + action); 
      }*/
    })
    .catch((error) => {
      displayError(thisForm, error);
    });
  }

  function displayError(thisForm, error) {
    thisForm.querySelector('.loading').classList.remove('d-block');
    thisForm.querySelector('.error-message').innerHTML = error;
    thisForm.querySelector('.error-message').classList.add('d-block');
  }

})();
