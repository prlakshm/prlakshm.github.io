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
  const [activeTab, setActiveTab] = useState("email");

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
      try {
        const cal = await getCalApi();
        // Preload the Cal component
        cal("floatingButton", {
            calLink: "pranavil/30min",
          });
        // Customize UI elements
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
              "cal-bg-emphasis": "#575757",
            },
          },
        });
      } catch (error) {
        console.error("Error loading Cal:", error);
      }
    })();
  }, []);

  return (
    <div className="email-embed">
      <div className="tab-content" id="myTabContent">
      <ul className="tab-list">
        <li>
          <button onClick={() => setActiveTab("email")}>Message Me</button>
        </li>
        <li>
          <button onClick={() => setActiveTab("schedule")}>
            Schedule a Meeting
          </button>
        </li>
      </ul>
        {activeTab === "email" ? (
          <div
            aria-labelledby="form-tab"
            className="tab-pane flex-center"
            id="form"
            role="tabpanel"
          >
            <form
              onSubmit={handleSubmit}
              className="dark-mode-form flex-center"
            >
              <div className="form-group" style={{ marginTop: "0.25rem" }}>
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
              <div className="extra-field">
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
                className="submit-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send"}
              </button>
            </form>
            {responseMessage && (
              <div className="response-message" id="responseContainer">
                <p>{responseMessage}</p>
              </div>
            )}
          </div>
        ) : (
          <div
            aria-labelledby="schedule-tab"
            className="tab-pane"
            id="scheduleMeet"
            role="tabpanel"
          >
            <div id="my-cal-inline">
              <Cal
                calLink="pranavil/30min"
              ></Cal>
            </div>
          </div>
        )}
        ;
      </div>
    </div>
  );
}

export default EmailEmbed;
