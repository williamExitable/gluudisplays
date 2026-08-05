if (!customElements.get('share-modal')) {
  customElements.define(
    'share-modal',
    class ShareModal extends HTMLElement {
      constructor() {
        super();
        this.copyButton = null;
        this.urlInput = null;
        this.originalText = '';
      }

      connectedCallback() {
        this.copyButton = this.querySelector('.share-button__copy');
        this.urlInput = this.querySelector('.share-modal__url');
        if (!this.copyButton || !this.urlInput) return;

        this.originalText = this.copyButton.textContent.trim();
        this.copyButton.addEventListener('click', this.copyToClipboard.bind(this));
      }

      copyToClipboard() {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(this.urlInput.value).then(() => {
          this.copyButton.textContent = this.copyButton.dataset.copiedText || 'Gekopieerd';
          this.copyButton.classList.add('copied');

          setTimeout(() => {
            this.copyButton.textContent = this.originalText;
            this.copyButton.classList.remove('copied');
          }, 2000);
        });
      }

      updateUrl(url) {
        if (this.urlInput) this.urlInput.value = url;
      }
    }
  );
}
