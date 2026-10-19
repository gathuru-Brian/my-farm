(function () {
    "use strict";

    const API = window.ModernFarmsAPI;
    const root = document.querySelector(".mf-messenger");

    if (!root || !API) {
        return;
    }

    const role = root.dataset.messageRole;
    const list = document.getElementById("messageConversationList");
    const thread = document.getElementById("messageThread");
    const threadHeader = document.getElementById("messageThreadHeader");
    const form = document.getElementById("messageComposer");
    const input = document.getElementById("messageInput");
    const notice = document.getElementById("messageNotice");
    const sendButton = form?.querySelector("button[type='submit']");
    const producerSelect = document.getElementById("producerMessageSelect");
    const startButton = document.getElementById("startProducerConversation");

    let conversations = [];
    let activeConversationId = null;
    let producers = [];
    let requestInProgress = false;

    function escape(value) {
        return API.escapeHTML(value ?? "");
    }

    function showNotice(text, isError = false) {
        if (!notice) return;
        notice.textContent = text;
        notice.hidden = !text;
        notice.classList.toggle("error", isError);
    }

    function displayName(user) {
        return user?.name || user?.full_name || "Marketplace member";
    }

    function formatTime(value) {
        if (!value) return "";
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? ""
            : date.toLocaleString("en-KE", {
                dateStyle: "medium",
                timeStyle: "short"
            });
    }

    async function loadProducers() {
        if (role !== "customer" || !producerSelect) return;
        try {
            const response = await API.request("/messages/producers");
            producers = Array.isArray(response.producers) ? response.producers : [];
            producerSelect.innerHTML = producers.length
                ? `<option value="">Choose a producer</option>${producers.map(producer => {
                    const farms = (producer.farms || []).map(farm =>
                        [farm.name, farm.county || farm.location].filter(Boolean).join(" · ")
                    ).join(", ");
                    return `<option value="${Number(producer.id)}">${escape(displayName(producer))}${farms ? ` — ${escape(farms)}` : ""}</option>`;
                }).join("")}`
                : `<option value="">No active producers are available</option>`;
        } catch (error) {
            console.error("Unable to load producers for messaging:", error);
            producerSelect.innerHTML = `<option value="">Producers could not be loaded</option>`;
            showNotice(error.message || "Unable to load producers.", true);
        }
    }

    function renderConversations() {
        if (!list) return;
        if (!conversations.length) {
            list.innerHTML = `<p class="mf-empty">${role === "customer"
                ? "Choose a producer above to start a conversation."
                : "Customer conversations will appear here when they contact you."}</p>`;
            updateUnreadBadge(0);
            return;
        }

        list.innerHTML = conversations.map(conversation => {
            const peer = escape(displayName(conversation.peer));
            const preview = conversation.last_message?.body || "Conversation started";
            const unread = Number(conversation.unread_count || 0);
            return `
                <button type="button"
                    class="mf-conversation ${Number(conversation.id) === activeConversationId ? "active" : ""}"
                    data-conversation-id="${Number(conversation.id)}">
                    <span class="mf-conversation-top">
                        <strong>${peer}</strong>
                        ${unread ? `<span class="mf-unread-count">${unread}</span>` : ""}
                    </span>
                    <span class="mf-conversation-preview">${escape(preview)}</span>
                    <time>${escape(formatTime(conversation.updated_at))}</time>
                </button>`;
        }).join("");

        updateUnreadBadge(conversations.reduce(
            (total, conversation) => total + Number(conversation.unread_count || 0),
            0
        ));
    }

    function updateUnreadBadge(count) {
        const badge = document.getElementById(
            role === "customer" ? "customerMessageBadge" : "producerMessageBadge"
        );
        if (!badge) return;
        badge.textContent = String(count);
        badge.hidden = count < 1;
    }

    async function loadConversations() {
        const response = await API.request("/messages/conversations");
        conversations = Array.isArray(response.conversations)
            ? response.conversations
            : [];
        renderConversations();

        if (
            activeConversationId &&
            !conversations.some(item => Number(item.id) === activeConversationId)
        ) {
            activeConversationId = null;
            clearThread();
        }
    }

    function clearThread() {
        if (threadHeader) {
            threadHeader.textContent = role === "customer"
                ? "Choose a producer to start chatting."
                : "Choose a customer conversation.";
        }
        if (thread) thread.innerHTML = `<p class="mf-empty">Your messages will appear here.</p>`;
        if (input) input.disabled = true;
        if (sendButton) sendButton.disabled = true;
    }

    function renderMessages(messages) {
        if (!thread) return;
        if (!messages.length) {
            thread.innerHTML = `<p class="mf-empty">Send a message to get the conversation started.</p>`;
            return;
        }

        const currentUserId = Number(API.getCurrentUser()?.id || 0);
        thread.innerHTML = messages.map(message => {
            const mine = Number(message.sender_id) === currentUserId;
            return `
                <article class="mf-message ${mine ? "mine" : "theirs"}">
                    <div class="mf-message-meta">
                        <strong>${mine ? "You" : escape(message.sender_name || "Producer")}</strong>
                        <time>${escape(formatTime(message.created_at))}</time>
                    </div>
                    <p>${escape(message.body)}</p>
                </article>`;
        }).join("");
        thread.scrollTop = thread.scrollHeight;
    }

    async function openConversation(conversationId) {
        activeConversationId = Number(conversationId);
        renderConversations();
        try {
            const response = await API.request(
                `/messages/conversations/${activeConversationId}`
            );
            const peer = response.conversation?.peer;
            if (threadHeader) {
                threadHeader.textContent = peer
                    ? `Conversation with ${displayName(peer)}`
                    : "Conversation";
            }
            renderMessages(Array.isArray(response.messages) ? response.messages : []);
            if (input) input.disabled = false;
            if (sendButton) sendButton.disabled = false;
            await loadConversations();
        } catch (error) {
            showNotice(error.message || "Unable to load this conversation.", true);
        }
    }

    async function refresh() {
        if (requestInProgress) return;
        requestInProgress = true;
        try {
            await loadConversations();
            if (activeConversationId) {
                const response = await API.request(
                    `/messages/conversations/${activeConversationId}`
                );
                renderMessages(Array.isArray(response.messages) ? response.messages : []);
                await loadConversations();
            }
            showNotice("");
        } catch (error) {
            console.error("Unable to refresh messages:", error);
            showNotice(error.message || "Unable to refresh messages.", true);
        } finally {
            requestInProgress = false;
        }
    }

    async function startConversation(producerId) {
        const id = Number(producerId);
        if (!id) {
            showNotice("Choose a producer first.", true);
            return;
        }
        try {
            const response = await API.request("/messages/conversations", {
                method: "POST",
                body: JSON.stringify({ producer_id: id })
            });
            const conversationId = response.conversation?.id;
            if (!conversationId) throw new Error("The conversation could not be opened.");
            await loadConversations();
            await openConversation(conversationId);
            showNotice("You can message this producer before placing an order.");
        } catch (error) {
            showNotice(error.message || "Unable to start the conversation.", true);
        }
    }

    async function sendMessage(event) {
        event.preventDefault();
        const body = input?.value.trim();
        if (!activeConversationId || !body) return;
        if (sendButton) sendButton.disabled = true;
        try {
            await API.request(
                `/messages/conversations/${activeConversationId}`,
                {
                    method: "POST",
                    body: JSON.stringify({ body })
                }
            );
            input.value = "";
            await refresh();
        } catch (error) {
            showNotice(error.message || "Message could not be sent.", true);
        } finally {
            if (sendButton) sendButton.disabled = !activeConversationId;
        }
    }

    document.addEventListener("click", event => {
        const conversationButton = event.target.closest("[data-conversation-id]");
        if (conversationButton && list?.contains(conversationButton)) {
            openConversation(conversationButton.dataset.conversationId);
            return;
        }

        const productButton = event.target.closest("[data-message-producer]");
        if (productButton && role === "customer") {
            window.showCustomerSection?.("messages");
            if (producerSelect) producerSelect.value = productButton.dataset.messageProducer;
            startConversation(productButton.dataset.messageProducer);
        }
    });

    startButton?.addEventListener("click", () => {
        startConversation(producerSelect?.value);
    });
    form?.addEventListener("submit", sendMessage);

    async function initialize() {
        try {
            if (role === "customer") await loadProducers();
            await loadConversations();
        } catch (error) {
            console.error("Unable to initialize direct messages:", error);
            showNotice(error.message || "Unable to load messages.", true);
        }
    }

    initialize();
    window.setInterval(() => {
        const section = document.getElementById("messages");
        if (section?.classList.contains("active")) refresh();
    }, 10000);

    window.ModernFarmsMessages = { refresh, startConversation, openConversation };
})();
