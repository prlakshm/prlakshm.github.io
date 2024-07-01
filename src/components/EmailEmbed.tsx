import React, { useEffect, useState } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";
import "./email-embed.css";

function EmailEmbed() { 
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    reason: "",
    message: "",
  });

  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormState({
      ...formState,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", formState.name);
    formData.append("email", formState.email);
    formData.append("reason", formState.reason);
    formData.append("message", formState.message);
    formData.append("_gotcha", ""); // Honeypot field

    try {
      const response = await fetch("https://getform.io/f/ebpdderb", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        setResponseMessage(
          "Thanks for reaching out! I usually respond in 1-2 days."
        );
      } else {
        setResponseMessage(
          "Oops, something went wrong! Please try again later."
        );
      }
    } catch (error) {
      console.error("Error:", error);
      setResponseMessage("Oops, something went wrong! Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal("ui", {
        theme: "dark",
        styles: { branding: { brandColor: "#f8dcff" } },
        hideEventTypeDetails: false,
        layout: "month_view",
        cssVarsPerTheme: {
            light: {},
            dark: {
              "cal-brand": "#f8dcff",
              "cal-text": "#f8dcff",
              "cal-text-default": "#f8dcff",
              "cal-text-emphasis": "#f8dcff",
              "cal-text-subtle": "#f8dcff",
              "cal-border-emphasis": "#f8dcff",
              "cal-text-info": "#575757",
              "cal-text-inverted": "#575757",
              "cal-text-error": "pink",
              "cal-border": "#f8dcff",
              "cal-border-default": "#f8dcff",
              "cal-border-subtle": "#f8dcff",
              "cal-border-booker": "#f8dcff",
              "cal-text-muted": "#ccb6d2",
              "cal-border-muted": "#f8dcff",
              "cal-bg-emphasis": "#575757"}}
      });
    })();
  }, []);

  return (
    <div className="tab-content mt-3" id="myTabContent">
      <div
        aria-labelledby="form-tab"
        className="tab-pane fade show active"
        id="form"
        role="tabpanel"
      >
        <form
          onSubmit={handleSubmit}
          className="box-form"
          style={{ padding: "20px", margin: "10px" }}
        >
          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input
              className="form-control"
              id="name"
              name="name"
              placeholder="Enter your name"
              required
              type="text"
              value={formState.name}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              className="form-control"
              id="email"
              name="email"
              placeholder="Enter your email"
              required
              type="email"
              value={formState.email}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reason">Reason:</label>
            <div className="custom-dropdown">
              <select
                className="form-control"
                id="reason"
                name="reason"
                value={formState.reason}
                onChange={handleChange}
              >
                <option disabled selected value="">
                  Select a reason
                </option>
                <option value="Brown University">Brown University</option>
                <option value="Networking">Career + Networking</option>
                <option value="Coding Projects">
                  Questions on Coding Projects
                </option>
                <option value="Other">Other</option>
              </select>
              <span className="arrow"></span>
            </div>
          </div>
          <div style={{ display: "none !important" }}>
            <input name="_gotcha" type="text" />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message:</label>
            <textarea
              className="form-control"
              id="message"
              name="message"
              placeholder="Enter your message"
              required
              rows={5}
              value={formState.message}
              onChange={handleChange}
            />
          </div>
          <button
            className="btn btn-primary btn-block"
            style={{ background: "#0763bb", marginTop: "10px", width: "100%" }}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </form>
        {responseMessage && (
          <div
            className="centered-box"
            id="responseContainer"
            style={{ display: "block" }}
          >
            <p>{responseMessage}</p>
          </div>
        )}
      </div>
      <div
        aria-labelledby="schedule-tab"
        className="tab-pane fade"
        id="scheduleMeet"
        role="tabpanel"
      >
        <div id="my-cal-inline">
          <Cal calLink="pranavil/30min" config={{ layout: "month_view" }}></Cal>
        </div>
      </div>
    </div>
  );
};

export default EmailEmbed;
