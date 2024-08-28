function DOMContentLoaded() {
    var formLogin = document.querySelector("form");
    var isSubmitting = false;

    async function formLoginSubmit(event) {
        event.preventDefault();
        
        if (isSubmitting)
            return;

        isSubmitting = true;

        var formData = new FormData(formLogin);
        var formDataObject = Object.fromEntries(formData.entries());
        formDataObject.url = "/login";
        formDataObject.remember = formLogin.querySelector("#remember").checked;

        var submitButton = formLogin.querySelector("button");
        submitButton.disabled = true;

        try {
            var response = await fetch("/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formDataObject)
            });
            
            response = await response.json();
            if (response.isLogin)
                window.location.href = "/dashboard";
            else 
                alert(response.message);
        } catch (error) {
            console.error(error);
            formLogin.reset();
            alert(error.message);
        } finally {
            submitButton.disabled = false;
            isSubmitting = false;
        }
    }
    formLogin.addEventListener("submit", formLoginSubmit);
}
document.addEventListener("DOMContentLoaded", DOMContentLoaded);