// ==UserScript==
// @name         e-SUS-CDS AutoFill
// @namespace    https://github.com/fellypsantos/cds-autofill
// @version      2.0
// @description  Controla as requisições ao servidor de consultas de dados, e interações com o usuário.
// @author       Fellyp Santos
// @match        http://**/esus/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.js
// @noframes
// ==/UserScript==

/* global $, io, Ext, window, document, location, MutationObserver */

console.log('🔥 e-SUS-CDS-AutoFill 🔥')
console.log('💜 created by Fellyp Santos 💜')

const Snackbar = {
  created: false,
  init: () => {
    if (Snackbar.created) return

    const style = document.createElement('style')
    const snackbarElement = document.createElement('div')

    // configure style and toast
    style.type = 'text/css'
    style.innerHTML =
      '/* The snackbar - position it at the bottom and in the middle of the screen */ #snackbar { z-index: 10000 !important; box-shadow: 0px 0px 5px 2px #777; visibility: hidden; /* Hidden by default. Visible on click */ min-width: 250px; /* Set a default minimum width */ margin-left: -125px; /* Divide value of min-width by 2 */ background-color: #333; /* Black background color */ color: #fff; /* White text color */ text-align: center; /* Centered text */ border-radius: 2px; /* Rounded borders */ padding: 16px; /* Padding */ position: fixed; /* Sit on top of the screen */ z-index: 1; /* Add a z-index if needed */ left: 50%; /* Center the snackbar */ bottom: 30px; /* 30px from the bottom */ font-size: 16px; } /* Show the snackbar when clicking on a button (class added with JavaScript) */ #snackbar.show { visibility: visible; /* Show the snackbar */ /* Add animation: Take 0.5 seconds to fade in and out the snackbar. However, delay the fade out process for 2.5 seconds */ -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s; animation: fadein 0.5s, fadeout 0.5s 2.5s; } /* Animations to fade the snackbar in and out */ @-webkit-keyframes fadein { from {bottom: 0; opacity: 0;} to {bottom: 30px; opacity: 1;} } @keyframes fadein { from {bottom: 0; opacity: 0;} to {bottom: 30px; opacity: 1;} } @-webkit-keyframes fadeout { from {bottom: 30px; opacity: 1;} to {bottom: 0; opacity: 0;} } @keyframes fadeout { from {bottom: 30px; opacity: 1;} to {bottom: 0; opacity: 0;} }'
    snackbarElement.id = 'snackbar'
    snackbarElement.innerHTML = 'Hello World'

    document.getElementsByTagName('head')[0].appendChild(style) // inject style
    document.getElementsByTagName('body')[0].appendChild(snackbarElement) // create toast

    Snackbar.element = snackbarElement
    Snackbar.created = true
    console.log('Snackbar initiated!')
  },
  show: (message) => {
    if (Snackbar.created) {
      console.log('Snackbar.show()', message)
      $(Snackbar.element).html(message)
      $(Snackbar.element).addClass('show')
      setTimeout(() => $(Snackbar.element).removeClass('show'), 3000)
    } else {
      console.error('Use Snackbar.init() before use show() method.')
    }
  },
}

const SearchTemplate = {
  init: () => {
    const style = document.createElement('style')
    style.type = 'text/css'
    style.innerHTML =
      'ul.searchResult{list-style:none}.searchResult>li>a{display:block;padding:10px;border-bottom:1px solid #ccc;text-decoration:none!important;color:#333}.searchResult li a:hover{background-color:#e0edff;}.searchResult.user>:first-child{font-size:20px;font-weight:700}'
    document.getElementsByTagName('head')[0].appendChild(style)
    console.log('SearchTemplate initiated!')
  },
}

const SearchForm = {
  init: () => {
    const style = document.createElement('style')
    style.type = 'text/css'
    style.innerHTML =
      'form.search-container{display:flex;flex-direction:column;padding:10px}form.search-container .item{display:flex;flex-direction:column;margin-bottom:10px}form.search-container .item>input{padding:5px;border:1px solid #ccc;border-radius:3px;box-shadow:0 0 2px 0 #ccc;text-transform:uppercase}form.search-container .birthday{height: 13px}form.search-container .buttons{display:flex;justify-content:flex-end}form.search-container .buttons>button{border:none;padding:5px 10px;border-radius:2px;box-shadow:0 0 2px 1px #eee}form.search-container .buttons>.clear{background-color:#b34646;color:#fff;}form.search-container .buttons>.do-search{background-color:#3b9f53;color:#fff;margin-right:9px;}'
    document.getElementsByTagName('head')[0].appendChild(style)
    console.log('SearchForm initiated!')
  },
}

const RouteChecker = {
  isCI: () => location.hash.search(/cadastroIndividual\/detail?/) > -1,
  isCD: () => location.hash.search(/cadastroDomiciliar\/detail?/) > -1,
  getCurrent: () => {
    if (RouteChecker.isCI()) return 'CI'
    if (RouteChecker.isCD()) return 'CD'
  },
}

const Socket = {
  io: null,
  connect: () => {
    Socket.io = io('http://localhost:5000')
    Socket.listen()
  },
  listen: () => {
    Socket.io.on('userById', (response) => {
      if (!FormHelper.hasError(response)) {
        // Success
        console.log(response)
        FormHelper.UI.unlockButtons()
        FormHelper.UI.stopWaitTime()
        Snackbar.show('Encontrado!')
        fillUserInformation(response)
      }
    })
    Socket.io.on('userByName', (response) => {
      if (!FormHelper.hasError(response)) {
        // Success
        // console.log(response);
        FormHelper.UI.unlockButtons()
        FormHelper.UI.stopWaitTime()
        Snackbar.show('Busca terminou.')
        FormHelper.showSearchResultWindow(response)
      }
    })
    Socket.io.on('verifiedResponsible', (response) => {
      if (!FormHelper.hasError(response)) {
        // Success
        console.log(response)
        FormHelper.UI.unlockButtons()
        FormHelper.UI.stopWaitTime()
        Snackbar.show('Tudo certo, verificado!')
        FormHelper.UI.CD.fillTextInputs(response)
      }
    })
    Socket.io.on('connect', () =>
      console.log('Conexão WebSocket estabelecida!'),
    )
    Socket.io.on('connect_error', () => console.log('connect_error'))
  },
}

const FormHelper = {
  winSearchResult: null,
  searchForm: null,
  saveButton: { pressed: false, inPage: false },
  timerAlert: null,
  timerCritical: null,

  Fields: {
    text_fields: {
      cns: 5,
      nome: 9,
      microArea: 10,
      nascimento: 13,
      mae: 23,
      pai: 25,
      telefone: 35,
    },
    radio_fields: {
      nacionalidade: {
        brasileira: 27,
        naturalizado: 28,
        estrangeiro: 29,
      },
      sexo: {
        feminino: 14,
        masculino: 15,
      },
      cor: {
        branca: 16,
        preta: 17,
        parda: 18,
        amarela: 19,
        indigena: 20,
      },
    },
    default_radio_schema: [
      23,
      48,
      50,
      52,
      54,
      56,
      58,
      64,
      70,
      74,
      76,
      79,
      81,
      83,
      85,
      87,
      89,
      91,
      93,
      95,
      97,
      99,
      101,
      103,
      105,
      107,
      109,
      111,
      113,
      115,
      117,
    ],
    CI: {
      labelCityName: null,
      getTextInputs: () => {
        const textInputs = $('input[type="text"]')
        return {
          cns: textInputs.eq(5),
          name: textInputs.eq(7),
          birthday: textInputs.eq(10),
          mother: textInputs.eq(13),
        }
      },
    },
    CD: {
      getTextInputs: () => {
        const textInputs = $('input[type="text"]')
        return {
          cns: textInputs.eq(22),
          birthday: textInputs.eq(23),
        }
      },
    },
  },

  UI: {
    lockButtons: () => {
      console.log('❗ Botões bloquados.')
      $('#btnConsultarCNS').attr('disabled', '').html('Aguarde..')
      $('#btnConsultarPorNome')
        .attr('disabled', 'disabled')
        .html('Buscando, aguarde...')
      $('#btnVerificarResponsavel').attr('disabled', '').html('Verificando...')
    },
    unlockButtons: () => {
      console.log('✔ Botões liberados.')
      $('#btnConsultarCNS').removeAttr('disabled').html(Text.btnConsultarCNS)
      $('#btnConsultarPorNome')
        .removeAttr('disabled')
        .html(Text.btnConsultarPorNome)
      $('#btnVerificarResponsavel')
        .removeAttr('disabled', '')
        .html(Text.btnVerificarResponsavel)
    },
    startWaitTime: () => {
      // 15 seconds of waiting
      FormHelper.timerAlert = setTimeout(
        () => Snackbar.show('Ainda procurando...'),
        15000,
      )

      // 30 seconds of waiting
      FormHelper.timerCritical = setTimeout(() => {
        Snackbar.show('Sem respostas, tente novamente.')
        FormHelper.UI.unlockButtons()
      }, 30000)
    },
    stopWaitTime: () => {
      console.log('🕒 Tempo de espera encerrado.')
      clearTimeout(FormHelper.timerAlert)
      clearTimeout(FormHelper.timerCritical)
    },
    closeSearch: () => FormHelper.winSearchResult.close(),
    checkDefaultRadioButtons: () => {
      /* Check default radios */
      FormHelper.Fields.default_radio_schema.forEach((index) =>
        $('input[type="radio"]').eq(index).click(),
      )

      /* Focus to city name input */
      $('input')[33].focus()
    },
    openSearchForm: () => {
      FormHelper.searchForm = new Ext.Window({
        id: 'search-form',
        title: 'Resultado da busca',
        modal: true,
        width: 350,
        height: 235,
        layout: 'fit',
        items: {
          xtype: 'panel',
          closable: true,
          autoScroll: true,
          html: `<form class="search-container">
<div class="item">
<label for="nome">Nome:</label>
<input type="text" id="nome"/>
</div>

<div class="item">
<label for="nascimento">Data de Nascimento:</label>
<input type="date" class="birthday" id="nascimento"/>
</div>

<div class="item">
<label for="mae">Nome da Mãe:</label>
<input type="text" id="mae"/>
</div>

<div class="buttons">
<button class="do-search">Pesquisar</button>
<button class="clear">Limpar</button>
</div>
</form>`,
        },
      })

      FormHelper.searchForm.show()
    },
    sendSearchForm: (event) => {
      event.preventDefault()
      const name = $('#nome')
      const mother = $('#mae')
      const birthday = $('#nascimento')

      if (name.length == 0) return false
      API.findByName(name, mother, birthday)
    },
    clearSearchForm: (event) => {
      event.preventDefault()
      $('form.search-container')[0].reset()
    },
    CI: {
      addCityName: () => {
        // add label to show city name saved in national database
        if ($('#labelCityName').length == 0) {
          $('<span id="labelCityName"></span>')
            .css({
              position: 'absolute',
              top: '470px',
              left: '8px',
              textTransform: 'uppercase',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#3d1ae6',
            })
            .insertAfter(
              $(
                'div[peid="CadastroIndividualForm.identificacaoUsuarioCidadao"]',
              ),
            )

          FormHelper.Fields.CI.labelCityName = $('#labelCityName')
        }
      },
    },
    CD: {
      fillTextInputs: (response) => {
        const textInputs = FormHelper.Fields.CD.getTextInputs()
        textInputs.cns.val(response.cns)
        textInputs.birthday.focus().val(response.nascimento)
      },
    },
  },

  isEditingMode: () => {
    const professional = $('input[type="text"]').eq(0).val()
    return professional !== ''
  },

  listenSaveAction: () => {
    const { saveButton } = FormHelper
    if (saveButton.pressed) {
      Socket.io.emit(`${saveButton.inPage}_saveButtonPressed`)
      saveButton.pressed = false

      if (saveButton.inPage === 'CI')
        console.log('💾 Salvou um cadastro Individual.')
      else if (saveButton.inPage === 'CD')
        console.log('💾 Salvou um cadastro Domiciliar.')
    }
  },

  formatCNS: (cns) =>
    cns.replace(/^(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4'),

  getSaveButton: () =>
    new Promise((resolve) => {
      const timer = setInterval(() => {
        const button = $(
          'button.simple-btn.border.round.shadow.rodape.positivo',
        )
        if (button[1].innerText == 'Salvar') {
          clearInterval(timer)
          resolve(button[1])
        }
      }, 250)
    }),

  addEventSaveButton: async () => {
    if (!FormHelper.isEditingMode()) {
      console.log('🆕 Novo cadastro.')
      const saveButton = await FormHelper.getSaveButton()
      // $(saveButton).click(() => {FormHelper.saveButton.pressed = true});
      $(saveButton).click(() => {
        FormHelper.saveButton = {
          pressed: true,
          inPage: RouteChecker.getCurrent(),
        }
      })
    } else {
      console.log('⏹ Modo de edição.')
    }
  },

  hasError: (response) => {
    if (response.error || response == 'Erro desconhecido') {
      if (response.error == 'COOKIE_EXPIRED') {
        Socket.io.emit('loggedOut')
        console.log('loggedOut')
      }
      Ext.MessageBox.alert(
        'Ocorreu um Erro!',
        `${response.description || response}`,
      )
      FormHelper.UI.unlockButtons()
      FormHelper.UI.stopWaitTime()
      console.error('Detalhes do erro: ', response)
      return true
    }
    return false
  },

  handleSearchSelection: (element) => {
    if (RouteChecker.isCI()) {
      console.log('Selecionou resultado de busca no CI')
      const id = $(element).data('cns').toString()
      API.findById(id)
    } else if (RouteChecker.isCD()) {
      console.log('Selecionou resultado de busca no CD')
      const id = $(element).data('cns').toString()
      const birthday = $(element).find('p').eq(3).text().replace('No dia: ', '')
      FormHelper.UI.CD.fillTextInputs({ cns: id, nascimento: birthday })
    }

    FormHelper.UI.closeSearch()
  },

  showSearchResultWindow: (response) => {
    let htmlList = ''

    if (response.length == 0) {
      Ext.MessageBox.alert('Resultado da busca', 'Nenhum usuário encontrado.')
      return
    }

    response.map((user) => {
      htmlList += `<li>
        <a href="javascript:void(0)" data-cns="${user.cns}">
          <div class="user">
            <h5><b>${FormHelper.formatCNS(user.cns)}</b></h5>
            <p><b>Nome: </b>${user.nome}</p>
            <p><b>Mãe: </b>${user.mae || 'SEM INFORMAÇÃO'}</p>
            <p><b>Nascido em: </b>${user.municipio || 'SEM INFORMAÇÃO'}</p>
            <p><b>No dia: </b>${user.nascimento || 'SEM INFORMAÇÃO'}</p>
          </div>
        </a>
      </li>`
    })

    if (FormHelper.searchForm !== null) FormHelper.searchForm.close()

    FormHelper.winSearchResult = new Ext.Window({
      id: 'search-form',
      title: 'Resultado da busca',
      modal: true,
      width: 450,
      height: 400,
      layout: 'fit',
      items: {
        xtype: 'panel',
        closable: true,
        autoScroll: true,
        html: `<ul class="searchResult">${htmlList}</ul>`,
      },
    })
    FormHelper.winSearchResult.show()
  },
}

const API = {
  findById: (id) => {
    if (id === '') return false
    FormHelper.UI.lockButtons()
    FormHelper.UI.startWaitTime()
    Snackbar.show('🔎 Pesquisando usuário...')
    Socket.io.emit('findUserById', { id })
  },
  findByName: (name, birthday, mother) => {
    name = name.val()
    birthday = birthday.val()
    mother = mother.val()

    if (name.length == 0) return
    birthday =
      birthday.indexOf('-') > -1
        ? birthday.split('-').reverse().join('/')
        : birthday

    FormHelper.UI.lockButtons()
    FormHelper.UI.startWaitTime()
    console.log('findByBame', name, birthday, mother)
    Snackbar.show('🔎 Procurando usuário por nome...')
    Socket.io.emit('findUserByName', { name, birthday, mother })
  },
  verifyResponsible: (id) => {
    if (id === '') return false
    FormHelper.UI.lockButtons()
    FormHelper.UI.startWaitTime()
    Snackbar.show('🔎 Verificando, aguarde...')
    Socket.io.emit('verifyResponsible', { id })
  },
}

const Text = {
  btnConsultarCNS: 'Consultar',
  btnConsultarPorNome: 'Procurar por Nome',
  btnMarcarPadrao: 'Marcar Opções Padrão',
  btnVerificarResponsavel: 'Verificar Responsável',
  btnAbrirFormPesquisa: 'Abrir Janela de Pesquisa',
}

const fillUserInformation = (response) => {
  /* Fill text fields */
  for (const field in FormHelper.Fields.text_fields) {
    const textField = document.querySelectorAll('input')[FormHelper.Fields.text_fields[field]];

    setTimeout(() => {
        console.log(textField, response[field])
        textField.focus()
        textField.value = response[field]
    }, 200);

    /* Search for null values */
    const index = field === 'mae' ? 24 : 26

    /* Check field 'DESCONHECIDO' */
    if (response[field] == null) $('input').eq(index).click()
  }

  setTimeout(() => {
      document.querySelectorAll('input')[35].value = response.telefone;
      console.log('forcerd phone number in timeout');
  }, 500);

  /* Fill null radios buttons */
  for (const field in FormHelper.Fields.radio_fields) {
    if (response[field] != null) {
      const key = response[field].toLowerCase()
      const index = FormHelper.Fields.radio_fields[field][key]
      $('input').eq(index).click()
    }
  }

  console.log('End of FillUserInfo')
  FormHelper.Fields.CI.labelCityName.text(
    response.municipio || 'SEM INFORMAÇÃO NA BASE DE DADOS',
  )
  FormHelper.UI.checkDefaultRadioButtons()
}

const mutationObserver = new MutationObserver((mutations) => {
  const { oldValue } = mutations[0]
  if (oldValue.search(/width: 120px;/) > -1) {
    console.log('🔄 Refresh detectado na página, reaplicando modificações...')
    MainInject()
    mutationObserver.disconnect()
  }
})

async function MainInject() {
  FormHelper.listenSaveAction()

  if (RouteChecker.isCI()) {
    console.log('✅ Cadastro Individual')

    const textInputs = FormHelper.Fields.CI.getTextInputs()

    // resize the inputs to place buttons beside
    textInputs.cns.css({ width: '120px' })
    textInputs.name.css({ width: '550px' })

    // add button to fetch user data
    if ($('#btnConsultarCNS').length == 0) {
      $(`<button id="btnConsultarCNS">${Text.btnConsultarCNS}</button>`)
        .addClass(' x-form-button x-form-field ')
        .css({ position: 'absolute', top: '16px', left: '132px' })
        .insertAfter(textInputs.cns)
        .click(() => API.findById(textInputs.cns.val()))
    }

    // add button to search user by name, birthday and mother
    if ($('#btnConsultarPorNome').length == 0) {
      $(`<button id="btnConsultarPorNome">${Text.btnConsultarPorNome}</button>`)
        .addClass(' x-form-button x-form-field ')
        .css({ position: 'absolute', top: '16px', left: '565px' })
        .insertAfter(textInputs.name)
        .click(() =>
          API.findByName(
            textInputs.name,
            textInputs.birthday,
            textInputs.mother,
          ),
        )
    }

    // mark radio buttons with pattern
    if ($('#btnMarcarPadrao').length == 0) {
      $(`<button id="btnMarcarPadrao">${Text.btnMarcarPadrao}</button>`)
        .addClass(' x-form-button x-form-field ')
        .css({ position: 'absolute', top: '0px', right: '0px' })
        .insertAfter($('div[peid="InformacoesSocioDemograficasForm.ocupacao"]'))
        .click(() => FormHelper.UI.checkDefaultRadioButtons())
    }

    FormHelper.addEventSaveButton()
    FormHelper.UI.CI.addCityName()

    // Starts listening for changes in the CNS attributes
    // [0] indicates the HTML Node, not jQuery Object
    mutationObserver.observe(textInputs.cns[0], {
      attributes: true,
      attributeOldValue: true,
    })
  } else if (RouteChecker.isCD()) {
    console.log('✅ Cadastro Domiciliar')

    const textFields = FormHelper.Fields.CD.getTextInputs()

    // add button to verify CNS/CPF
    if ($('#btnVerificarResponsavel').length == 0) {
      $(
        `<button id="btnVerificarResponsavel">${Text.btnVerificarResponsavel}</button>`,
      )
        .addClass(' x-form-button x-form-field ')
        .css({
          position: 'absolute',
          top: '62px',
          left: '118px',
          width: '124px',
        })
        .insertAfter($('div[peid="CadastroDomiciliarForm.familiaForms"]'))
        .click(() => API.verifyResponsible(textFields.cns.val()))
    }

    // add button to open search popup
    if ($('#btnAbrirFormPesquisa').length == 0) {
      $(
        `<button id="btnAbrirFormPesquisa">${Text.btnAbrirFormPesquisa}</button>`,
      )
        .addClass(' btn btn-primary btn-xs ')
        .css({
          position: 'absolute',
          top: '64px',
          right: '78px',
          height: '22px',
          padding: '1px 10px',
        })
        .insertAfter(
          $('div[peid="FamiliaFormEditableComponentFlexList.Confirmar"]'),
        )
        .click(() => FormHelper.UI.openSearchForm())
    }

    FormHelper.addEventSaveButton()
  }
}

function MainInit() {
  console.log('>> Lets start! <<')
  Snackbar.init()
  SearchTemplate.init()
  SearchForm.init()
  MainInject()
  Socket.connect()

  // Dynamic buttons
  $(document).on('click', '.searchResult a', (event) =>
    FormHelper.handleSearchSelection(event.currentTarget),
  )
  $(document).on('click', '.search-container .clear', (event) =>
    FormHelper.UI.clearSearchForm(event),
  )
  $(document).on('click', '.search-container .do-search', (event) =>
    FormHelper.UI.sendSearchForm(event),
  )
}

window.addEventListener('load', MainInit, false)
window.addEventListener('hashchange', MainInject, false)
