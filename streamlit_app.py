"""
streamlit_app.py — "The World After Dark"  (Analyticon 2026 VizCon)
Deploy target: Streamlit Community Cloud (free public URL, like last year's winner).

The whole cinematic experience is a self-contained HTML/JS/CSS bundle rendered
full-window inside a Streamlit component. Streamlit here is just the immersive,
zero-cost host + public URL.

Run locally:   streamlit run streamlit_app.py
Deploy:        push to GitHub -> share.streamlit.io -> point at this file.
"""

import streamlit as st
import streamlit.components.v1 as components
from inline_build import build_inline_html
from visitor_log import log_visit, read_recent, resolve_current_identity

st.set_page_config(
    page_title="The World After Dark · Analyticon 2026",
    page_icon="🌌",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ---- capture who opens the project (once per session) -------------------
visit = log_visit(st)

# Owner aliases allowed to view the private log (edit to taste, or set an
# ADMIN_TOKEN in .streamlit/secrets.toml and open with ?admin=<token>).
_OWNERS = {"jsharat", "sharath"}


def _is_owner() -> bool:
    ident = (resolve_current_identity(st) or "").lower()
    if any(o in ident for o in _OWNERS):
        return True
    try:
        token = st.secrets.get("ADMIN_TOKEN")
        if token and st.query_params.get("admin") == token:
            return True
    except Exception:
        pass
    return False


# Private admin view of the visit log: /?admin=1 — only the owner (verified by
# SSO identity) or someone with the secret ADMIN_TOKEN can actually see it.
if st.query_params.get("admin"):
    if _is_owner():
        st.title("🔐 Visit log — The World After Dark")
        st.caption("Real identities are captured automatically behind Midway / ALB-OIDC / "
                   "Harmony. On a plain public app, use native login or ?viewer=<alias> links.")
        rows = read_recent(500)
        if rows:
            st.metric("Total logged visits", len(rows))
            st.dataframe(rows, use_container_width=True, hide_index=True)
            import io, csv as _csv
            buf = io.StringIO()
            w = _csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
            w.writeheader(); w.writerows(rows)
            st.download_button("Download full log (CSV)", data=buf.getvalue(),
                               file_name="visits.csv", mime="text/csv")
        else:
            st.info("No visits recorded yet.")
    else:
        st.error("🔒 Not authorized. The visit log is private to the project owner.")
    st.stop()

# Strip all Streamlit chrome so the experience is edge-to-edge and immersive.
st.markdown(
    """
    <style>
      #MainMenu, header, footer {visibility: hidden;}
      [data-testid="stToolbar"], [data-testid="stDecoration"],
      [data-testid="stStatusWidget"] {display: none !important;}
      .stApp {background: #04060d;}
      .block-container {padding: 0 !important; max-width: 100% !important;}
      [data-testid="stAppViewContainer"] > .main {padding: 0 !important;}
      iframe {border: none !important;}
      html, body {margin: 0; padding: 0; background: #04060d;}
    </style>
    """,
    unsafe_allow_html=True,
)

# Render the bundle. The embedded fit-script grows the iframe to the full window;
# height/scrolling here are the fallback if that is blocked.
components.html(build_inline_html(), height=900, scrolling=True)
