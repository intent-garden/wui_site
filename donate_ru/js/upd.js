document.addEventListener('DOMContentLoaded', () => {
    const params       = new URLSearchParams(window.location.search);
    
    const instid       = params.get('instid');
    const instid_input = document.getElementById('instid');

    if (instid !== null && instid_input) {
        instid_input.value = instid;
    }

    const email        = params.get('email');
    const email_input  = document.getElementById('email');
  
    if (email !== null && email_input) {
        email_input.value = email;
    }
  });
