export default function HiddenForm() {
    return (
      <form
        name="event-registration"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        hidden
      >
        <input type="text" name="name" />
        <input type="email" name="email" />
        <input type="checkbox" name="consent" />
        <input name="bot-field" />
      </form>
    );
  }