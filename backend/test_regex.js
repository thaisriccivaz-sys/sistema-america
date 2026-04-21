const text = 'Pessoa Relacionada:Julio Santos da Mota Proprietario:Julio Santos da Mota TLR0H811 - Chassi:93ZG6350Z5B209778';
console.log(text.match(/(?:^|\s)([A-Z]{3}[-\s]*[0-9][A-Z0-9]{3,4})(?:[-\s]|$)/i));
